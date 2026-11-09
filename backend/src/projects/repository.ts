import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";

/**
 * Modelo de acceso a `Project` (data-model.md "Projects"): `confirmedAmountCents` y
 * `goalAmountCents` SIEMPRE enteros (céntimos de PEN), nunca `float` (Principio constitucional II).
 */
export interface ProjectRecord {
  projectId: string;
  title: string;
  description: string;
  goalAmountCents: number;
  confirmedAmountCents: number;
  currency: "PEN";
  status: "BORRADOR" | "PUBLICADO";
  createdAt: string;
  updatedAt: string;
}

export type PublishResult =
  | { ok: true; project: ProjectRecord }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_PUBLISHED" };

export interface ProjectsRepository {
  /** Solo proyectos `PUBLICADO` (CA-01.1, CA-01.2), vía el GSI `status-createdAt`. */
  listPublished(): Promise<ProjectRecord[]>;
  getById(projectId: string): Promise<ProjectRecord | undefined>;
  create(input: { title: string; description: string; goalAmountCents: number }): Promise<ProjectRecord>;
  /** Transición BORRADOR → PUBLICADO; 409 (ALREADY_PUBLISHED) si ya estaba publicado (CA-08.2). */
  publish(projectId: string): Promise<PublishResult>;
}

const TABLE_NAME = process.env.PROJECTS_TABLE_NAME ?? "";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const dynamoDbProjectsRepository: ProjectsRepository = {
  async listPublished() {
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "status-createdAt",
        KeyConditionExpression: "#status = :published",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":published": "PUBLICADO" },
      }),
    );
    return (result.Items ?? []) as ProjectRecord[];
  },

  async getById(projectId) {
    const result = await client.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { projectId } }),
    );
    return result.Item as ProjectRecord | undefined;
  },

  async create(input) {
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      projectId: randomUUID(),
      title: input.title,
      description: input.description,
      goalAmountCents: input.goalAmountCents,
      confirmedAmountCents: 0,
      currency: "PEN",
      status: "BORRADOR",
      createdAt: now,
      updatedAt: now,
    };
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: project,
        ConditionExpression: "attribute_not_exists(projectId)",
      }),
    );
    return project;
  },

  async publish(projectId) {
    const now = new Date().toISOString();
    try {
      const result = await client.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { projectId },
          UpdateExpression: "SET #status = :published, updatedAt = :now",
          ConditionExpression: "attribute_exists(projectId) AND #status = :draft",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":published": "PUBLICADO", ":draft": "BORRADOR", ":now": now },
          ReturnValues: "ALL_NEW",
        }),
      );
      return { ok: true, project: result.Attributes as ProjectRecord };
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        const existing = await dynamoDbProjectsRepository.getById(projectId);
        return {
          ok: false,
          reason: existing === undefined ? "NOT_FOUND" : "ALREADY_PUBLISHED",
        };
      }
      throw error;
    }
  },
};
