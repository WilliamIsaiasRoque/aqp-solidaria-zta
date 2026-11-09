import { describe, expect, it, vi } from "vitest";
import { createListProjectsHandler } from "../../src/projects/listProjects.js";
import { createCreateProjectHandler } from "../../src/projects/createProject.js";
import type { ProjectRecord, ProjectsRepository } from "../../src/projects/repository.js";
import type { AuditRepository } from "../../src/audit/recordEvent.js";

/**
 * T01 y T03 (requirements.md §6, Fase 3). Igual que en Fase 2 (auth.test.ts): se prueba la lógica
 * del handler con un repositorio en memoria (implementando el mismo contrato que
 * `dynamoDbProjectsRepository`), no contra DynamoDB real — la verificación de extremo a extremo
 * contra el stage desplegado se documenta en quickstart.md, Escenario 1 y 3.
 */
function buildProject(overrides: Partial<ProjectRecord>): ProjectRecord {
  const now = new Date().toISOString();
  return {
    projectId: "project-1",
    title: "Comedor comunitario",
    description: "Alimentación para 50 familias",
    goalAmountCents: 500000,
    confirmedAmountCents: 0,
    currency: "PEN",
    status: "PUBLICADO",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildRepo(projects: ProjectRecord[]): ProjectsRepository {
  return {
    async listPublished() {
      return projects.filter((p) => p.status === "PUBLICADO");
    },
    async getById(projectId) {
      return projects.find((p) => p.projectId === projectId);
    },
    async create() {
      throw new Error("no usado en este test");
    },
    async publish() {
      throw new Error("no usado en este test");
    },
  };
}

function buildEvent(body?: unknown, authorizerClaims?: Record<string, unknown>) {
  return {
    body: body ? JSON.stringify(body) : undefined,
    requestContext: {
      requestId: "test-request-id",
      authorizer: authorizerClaims
        ? { jwt: { claims: authorizerClaims, scopes: [] } }
        : undefined,
    },
  } as unknown;
}

describe("T01 — visitante consulta proyectos → 200, sin borradores", () => {
  it("devuelve solo proyectos PUBLICADO", async () => {
    const repo = buildRepo([
      buildProject({ projectId: "p-published", status: "PUBLICADO" }),
      buildProject({ projectId: "p-draft", status: "BORRADOR" }),
    ]);
    const handler = createListProjectsHandler(repo);

    const result = await handler(buildEvent() as Parameters<typeof handler>[0]);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].projectId).toBe("p-published");
  });

  it("devuelve una lista vacía sin error técnico cuando no hay proyectos publicados (CA-01.3)", async () => {
    const repo = buildRepo([]);
    const handler = createListProjectsHandler(repo);

    const result = await handler(buildEvent() as Parameters<typeof handler>[0]);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual({ items: [] });
  });
});

describe("T03 — donante intenta crear proyecto → 403", () => {
  it("rechaza con 403 a un usuario sin el grupo GESTOR", async () => {
    const repo = buildRepo([]);
    const audit: AuditRepository = { record: vi.fn() };
    const handler = createCreateProjectHandler(repo, audit);

    const result = await handler(
      buildEvent(
        { title: "x", description: "y", goalAmountCents: 100 },
        { sub: "donor-1", token_use: "access", "cognito:groups": ["DONANTE"] },
      ) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body as string);
    expect(body.code).toBe("FORBIDDEN");
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("crea el proyecto en BORRADOR y registra auditoría cuando el usuario es GESTOR (CA-08.1, CA-08.3)", async () => {
    const created = buildProject({ status: "BORRADOR" });
    const repo: ProjectsRepository = {
      ...buildRepo([]),
      create: vi.fn().mockResolvedValue(created),
    };
    const audit: AuditRepository = { record: vi.fn().mockResolvedValue(undefined) };
    const handler = createCreateProjectHandler(repo, audit);

    const result = await handler(
      buildEvent(
        { title: "Comedor comunitario", description: "Alimentación", goalAmountCents: 500000 },
        { sub: "manager-1", token_use: "access", "cognito:groups": ["GESTOR"] },
      ) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body as string).status).toBe("BORRADOR");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.create", actorRef: "manager-1" }),
    );
  });
});
