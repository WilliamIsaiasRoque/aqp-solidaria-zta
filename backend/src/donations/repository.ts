import {
  DynamoDBClient,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { createHash, randomUUID } from "node:crypto";

/**
 * Modelo de acceso a `Donation` (data-model.md "Donations"): `amountCents` siempre entero
 * (céntimos de PEN), nunca `float` (Principio constitucional II).
 */
export interface DonationRecord {
  donationId: string;
  projectId: string;
  donorSub: string;
  amountCents: number;
  currency: "PEN";
  status: "PENDIENTE_SIMULACION" | "CONFIRMADA_SIMULADA" | "RECHAZADA_SIMULADA";
  createdAt: string;
  updatedAt: string;
}

export interface CreateDonationInput {
  projectId: string;
  amountCents: number;
  donorSub: string;
  idempotencyKey: string;
}

export type CreateDonationOutcome =
  | { outcome: "created"; donation: DonationRecord }
  | { outcome: "duplicate"; donation: DonationRecord }
  | { outcome: "conflict" };

export interface DonationsRepository {
  /**
   * Reserva de clave de idempotencia y creación de la donación en una única operación atómica
   * (`TransactWriteItems` condicionado, AD-05, Principio constitucional IV). Misma clave + mismo
   * `payloadHash` → `duplicate` (mismo resultado, sin crear otra donación, CA-05.4); misma clave +
   * `payloadHash` distinto → `conflict` (409, CA-05.4).
   */
  create(input: CreateDonationInput): Promise<CreateDonationOutcome>;
  getById(donationId: string): Promise<DonationRecord | undefined>;
  /** Solo donaciones del `donorSub` dado (CA-07.1), vía el GSI `donorSub-createdAt`. */
  listByDonor(donorSub: string): Promise<DonationRecord[]>;
}

const DONATIONS_TABLE = process.env.DONATIONS_TABLE_NAME ?? "";
const IDEMPOTENCY_TABLE = process.env.IDEMPOTENCY_TABLE_NAME ?? "";
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 h, design.md §5

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** SHA-256 del body normalizado de la solicitud (design.md §5, data-model.md "IdempotencyRecord"). */
export function computePayloadHash(input: { projectId: string; amountCents: number }): string {
  const normalized = JSON.stringify({ projectId: input.projectId, amountCents: input.amountCents });
  return createHash("sha256").update(normalized).digest("hex");
}

export const dynamoDbDonationsRepository: DonationsRepository = {
  async create(input) {
    const payloadHash = computePayloadHash(input);
    const pk = `${input.donorSub}#createDonation#${input.idempotencyKey}`;
    const now = new Date().toISOString();
    const donation: DonationRecord = {
      donationId: randomUUID(),
      projectId: input.projectId,
      donorSub: input.donorSub,
      amountCents: input.amountCents,
      currency: "PEN",
      status: "PENDIENTE_SIMULACION",
      createdAt: now,
      updatedAt: now,
    };

    try {
      await client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: IDEMPOTENCY_TABLE,
                Item: {
                  pk,
                  payloadHash,
                  donationId: donation.donationId,
                  responseStatus: 201,
                  expiresAt: Math.floor(Date.now() / 1000) + IDEMPOTENCY_TTL_SECONDS,
                },
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
            {
              Put: {
                TableName: DONATIONS_TABLE,
                Item: donation,
                ConditionExpression: "attribute_not_exists(donationId)",
              },
            },
          ],
        }),
      );
      return { outcome: "created", donation };
    } catch (error) {
      if (error instanceof TransactionCanceledException) {
        // La escritura fue atómica y falló por condición; esta lectura posterior solo determina
        // qué respuesta devolver (duplicado vs. conflicto), no forma parte de la transacción.
        const existingRecord = await client.send(
          new GetCommand({ TableName: IDEMPOTENCY_TABLE, Key: { pk } }),
        );
        const existing = existingRecord.Item as
          | { payloadHash?: string; donationId?: string }
          | undefined;

        if (existing?.payloadHash === payloadHash && existing.donationId) {
          const existingDonation = await dynamoDbDonationsRepository.getById(existing.donationId);
          if (existingDonation) {
            return { outcome: "duplicate", donation: existingDonation };
          }
        }
        if (existing) {
          return { outcome: "conflict" };
        }
      }
      throw error;
    }
  },

  async getById(donationId) {
    const result = await client.send(
      new GetCommand({ TableName: DONATIONS_TABLE, Key: { donationId } }),
    );
    return result.Item as DonationRecord | undefined;
  },

  async listByDonor(donorSub) {
    const result = await client.send(
      new QueryCommand({
        TableName: DONATIONS_TABLE,
        IndexName: "donorSub-createdAt",
        KeyConditionExpression: "donorSub = :donorSub",
        ExpressionAttributeValues: { ":donorSub": donorSub },
      }),
    );
    return (result.Items ?? []) as DonationRecord[];
  },
};
