import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

/**
 * `AuditEvent` (data-model.md "AuditEvent", CA-08.3): actor, fecha, acción y resultado de toda
 * creación/publicación de proyecto. `actorRef` es el `sub` del actor (seudónimo, no un dato
 * personal real); nunca se registran tokens, claves ni datos financieros (CA-10.2).
 */
export interface AuditEventInput {
  action: string;
  actorRef: string;
  resourceRef: string;
  outcome: "success" | "error";
  /** Correlación con logs estructurados (RNF-HU-07, CA-NF07.1). */
  requestId: string;
}

export interface AuditRepository {
  record(event: AuditEventInput): Promise<void>;
}

const TABLE_NAME = process.env.AUDIT_TABLE_NAME ?? "";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const dynamoDbAuditRepository: AuditRepository = {
  async record(event) {
    const timestamp = new Date().toISOString();
    const eventId = randomUUID();
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          eventType: event.action,
          sk: `${timestamp}#${eventId}`,
          eventId,
          timestamp,
          requestId: event.requestId,
          actorRef: event.actorRef,
          action: event.action,
          resourceRef: event.resourceRef,
          outcome: event.outcome,
        },
      }),
    );
  },
};
