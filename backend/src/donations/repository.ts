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

export interface SimulateDonationInput {
  donationId: string;
  donorSub: string;
  projectId: string;
  amountCents: number;
  outcome: "CONFIRMADA_SIMULADA" | "RECHAZADA_SIMULADA";
}

export type SimulateDonationOutcome =
  | { ok: true; donation: DonationRecord }
  | { ok: false; reason: "ALREADY_RESOLVED" };

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
  /**
   * Transición PENDIENTE_SIMULACION → estado terminal, e incremento de `confirmedAmountCents` del
   * proyecto SOLO si `outcome` es `CONFIRMADA_SIMULADA` (CA-06.3), en una única operación atómica
   * (`TransactWriteItems` condicionado a `status = PENDIENTE_SIMULACION` y `donorSub`, CA-06.2,
   * RNF-HU-04 CA-NF04.1/CA-NF04.2). La propiedad (403) y la existencia (404) de la donación se
   * verifican antes, en el handler, vía `getById`; este método solo resuelve la condición de
   * carrera: una transición ya resuelta devuelve `{ ok: false, reason: "ALREADY_RESOLVED" }`.
   */
  simulate(input: SimulateDonationInput): Promise<SimulateDonationOutcome>;
}

const DONATIONS_TABLE = process.env.DONATIONS_TABLE_NAME ?? "";
const IDEMPOTENCY_TABLE = process.env.IDEMPOTENCY_TABLE_NAME ?? "";
const PROJECTS_TABLE = process.env.PROJECTS_TABLE_NAME ?? "";
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

  async simulate(input) {
    const now = new Date().toISOString();

    try {
      await client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: DONATIONS_TABLE,
                Key: { donationId: input.donationId },
                UpdateExpression: "SET #status = :outcome, updatedAt = :now",
                ConditionExpression: "#status = :pending AND donorSub = :donorSub",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                  ":outcome": input.outcome,
                  ":pending": "PENDIENTE_SIMULACION",
                  ":donorSub": input.donorSub,
                  ":now": now,
                },
              },
            },
            ...(input.outcome === "CONFIRMADA_SIMULADA"
              ? [
                  {
                    Update: {
                      TableName: PROJECTS_TABLE,
                      Key: { projectId: input.projectId },
                      UpdateExpression: "ADD confirmedAmountCents :amount SET updatedAt = :now",
                      ConditionExpression: "attribute_exists(projectId)",
                      ExpressionAttributeValues: { ":amount": input.amountCents, ":now": now },
                    },
                  },
                ]
              : []),
          ],
        }),
      );
    } catch (error) {
      if (error instanceof TransactionCanceledException) {
        return { ok: false, reason: "ALREADY_RESOLVED" };
      }
      throw error;
    }

    const donation = await dynamoDbDonationsRepository.getById(input.donationId);
    if (!donation) {
      throw new Error("Inconsistencia: la donación desapareció tras una transacción exitosa.");
    }
    return { ok: true, donation };
  },
};
