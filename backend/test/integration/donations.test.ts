import { describe, expect, it } from "vitest";
import { createCreateDonationHandler } from "../../src/donations/createDonation.js";
import { createListMyDonationsHandler } from "../../src/donations/listMyDonations.js";
import { createGetDonationHandler } from "../../src/donations/getDonation.js";
import type { DonationRecord, DonationsRepository } from "../../src/donations/repository.js";
import type { ProjectRecord, ProjectsRepository } from "../../src/projects/repository.js";

/**
 * T04, T05, T06, T07 (HU-05) y T09, T12 (HU-07) — requirements.md §6, Fase 4. Igual que en las
 * Fases 2-3: se prueba la lógica de los handlers con repositorios en memoria que implementan el
 * mismo contrato (`DonationsRepository`/`ProjectsRepository`) que las implementaciones DynamoDB —
 * la verificación de extremo a extremo contra el stage desplegado se documenta por separado.
 */

function buildPublishedProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
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

function buildProjectsRepo(projects: ProjectRecord[]): ProjectsRepository {
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

/** Repositorio de donaciones en memoria: replica la semántica de idempotencia del contrato real. */
function buildDonationsRepo(seed: DonationRecord[] = []) {
  const donations = new Map(seed.map((d) => [d.donationId, d]));
  const idempotency = new Map<string, { payloadHash: string; donationId: string }>();
  let nextId = 1;

  const repo: DonationsRepository = {
    async create(input) {
      const payloadHash = JSON.stringify({
        projectId: input.projectId,
        amountCents: input.amountCents,
      });
      const key = `${input.donorSub}#createDonation#${input.idempotencyKey}`;
      const existing = idempotency.get(key);

      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          return { outcome: "conflict" };
        }
        const donation = donations.get(existing.donationId);
        if (!donation) throw new Error("inconsistencia de prueba");
        return { outcome: "duplicate", donation };
      }

      const now = new Date().toISOString();
      const donation: DonationRecord = {
        donationId: `donation-${nextId++}`,
        projectId: input.projectId,
        donorSub: input.donorSub,
        amountCents: input.amountCents,
        currency: "PEN",
        status: "PENDIENTE_SIMULACION",
        createdAt: now,
        updatedAt: now,
      };
      donations.set(donation.donationId, donation);
      idempotency.set(key, { payloadHash, donationId: donation.donationId });
      return { outcome: "created", donation };
    },
    async getById(donationId) {
      return donations.get(donationId);
    },
    async listByDonor(donorSub) {
      return [...donations.values()].filter((d) => d.donorSub === donorSub);
    },
    async simulate() {
      // No usado por los tests de esta fase (T04-T07, T09, T12); cubierto por simulate.test.ts.
      throw new Error("no usado en este test");
    },
  };

  return repo;
}

function buildEvent(options: {
  body?: unknown;
  headers?: Record<string, string>;
  pathParameters?: Record<string, string>;
  authorizerClaims?: Record<string, unknown>;
}) {
  return {
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    headers: options.headers ?? {},
    pathParameters: options.pathParameters,
    requestContext: {
      requestId: "test-request-id",
      authorizer: options.authorizerClaims
        ? { jwt: { claims: options.authorizerClaims, scopes: [] } }
        : undefined,
    },
  } as unknown;
}

const DONANTE_CLAIMS = { sub: "donor-1", token_use: "access", "cognito:groups": ["DONANTE"] };
const OTHER_DONANTE_CLAIMS = { sub: "donor-2", token_use: "access", "cognito:groups": ["DONANTE"] };
const GESTOR_CLAIMS = { sub: "manager-1", token_use: "access", "cognito:groups": ["GESTOR"] };

describe("T04 — monto inválido → 400", () => {
  it.each([
    ["cero", 0],
    ["fuera de rango", 100001],
    ["no entero", 10.5],
  ])("rechaza amountCents %s con 400 (CA-05.2)", async (_label, amountCents) => {
    const handler = createCreateDonationHandler(
      buildDonationsRepo(),
      buildProjectsRepo([buildPublishedProject()]),
    );

    const result = await handler(
      buildEvent({
        body: { projectId: "project-1", amountCents },
        headers: { "idempotency-key": "11111111-1111-1111-1111-111111111111" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(400);
  });

  it("rechaza la ausencia de Idempotency-Key con 400 (CA-05.2)", async () => {
    const handler = createCreateDonationHandler(
      buildDonationsRepo(),
      buildProjectsRepo([buildPublishedProject()]),
    );

    const result = await handler(
      buildEvent({
        body: { projectId: "project-1", amountCents: 1000 },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(400);
  });
});

describe("T05 — donante crea intención válida → 201, pendiente, sin cargo", () => {
  it("crea la donación en PENDIENTE_SIMULACION (CA-05.1, CA-05.3, CA-05.5)", async () => {
    const handler = createCreateDonationHandler(
      buildDonationsRepo(),
      buildProjectsRepo([buildPublishedProject()]),
    );

    const result = await handler(
      buildEvent({
        body: { projectId: "project-1", amountCents: 1000 },
        headers: { "idempotency-key": "22222222-2222-2222-2222-222222222222" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.status).toBe("PENDIENTE_SIMULACION");
    expect(body.donorSub).toBe("donor-1");
    expect(body).not.toHaveProperty("cardNumber");
  });

  it("devuelve 404 si el proyecto no existe y 409 si no está publicado (CA-05.2)", async () => {
    const handlerNotFound = createCreateDonationHandler(buildDonationsRepo(), buildProjectsRepo([]));
    const resultNotFound = await handlerNotFound(
      buildEvent({
        body: { projectId: "no-existe", amountCents: 1000 },
        headers: { "idempotency-key": "33333333-3333-3333-3333-333333333333" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handlerNotFound>[0],
    );
    expect(resultNotFound.statusCode).toBe(404);

    const handlerDraft = createCreateDonationHandler(
      buildDonationsRepo(),
      buildProjectsRepo([buildPublishedProject({ status: "BORRADOR" })]),
    );
    const resultDraft = await handlerDraft(
      buildEvent({
        body: { projectId: "project-1", amountCents: 1000 },
        headers: { "idempotency-key": "44444444-4444-4444-4444-444444444444" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handlerDraft>[0],
    );
    expect(resultDraft.statusCode).toBe(409);
  });
});

describe("T06 — repite clave y payload idénticos → mismo resultado, una sola donación", () => {
  it("devuelve el mismo donationId sin crear una segunda donación (CA-05.4)", async () => {
    const donationsRepo = buildDonationsRepo();
    const handler = createCreateDonationHandler(donationsRepo, buildProjectsRepo([buildPublishedProject()]));
    const event = buildEvent({
      body: { projectId: "project-1", amountCents: 1000 },
      headers: { "idempotency-key": "55555555-5555-5555-5555-555555555555" },
      authorizerClaims: DONANTE_CLAIMS,
    }) as Parameters<typeof handler>[0];

    const first = await handler(event);
    const second = await handler(event);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(JSON.parse(first.body as string).donationId).toBe(JSON.parse(second.body as string).donationId);
    expect(await donationsRepo.listByDonor("donor-1")).toHaveLength(1);
  });
});

describe("T07 — repite clave con payload distinto → 409", () => {
  it("rechaza la reutilización de la clave con un body diferente (CA-05.4)", async () => {
    const donationsRepo = buildDonationsRepo();
    const handler = createCreateDonationHandler(donationsRepo, buildProjectsRepo([buildPublishedProject()]));
    const idempotencyKey = "66666666-6666-6666-6666-666666666666";

    const first = await handler(
      buildEvent({
        body: { projectId: "project-1", amountCents: 1000 },
        headers: { "idempotency-key": idempotencyKey },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );
    const second = await handler(
      buildEvent({
        body: { projectId: "project-1", amountCents: 2000 },
        headers: { "idempotency-key": idempotencyKey },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
  });
});

describe("T09 — donante consulta donación ajena → 403/404 sin filtración (BOLA)", () => {
  it("devuelve 404 cuando la donación pertenece a otro donante, sin revelar su existencia", async () => {
    const donation: DonationRecord = {
      donationId: "donation-ajena",
      projectId: "project-1",
      donorSub: "donor-1",
      amountCents: 1000,
      currency: "PEN",
      status: "PENDIENTE_SIMULACION",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const handler = createGetDonationHandler(buildDonationsRepo([donation]));

    const result = await handler(
      buildEvent({
        pathParameters: { donationId: "donation-ajena" },
        authorizerClaims: OTHER_DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(404);
  });
});

describe("T12 — gestor consulta historial de un donante → 403/404", () => {
  it("rechaza con 403 a GET /v1/donations/me cuando el llamante no es DONANTE (CA-04.2)", async () => {
    const handler = createListMyDonationsHandler(buildDonationsRepo());

    const result = await handler(
      buildEvent({ authorizerClaims: GESTOR_CLAIMS }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(403);
  });

  it("rechaza con 403 a GET /v1/donations/{id} cuando el llamante es GESTOR (CA-04.2)", async () => {
    const donation: DonationRecord = {
      donationId: "donation-1",
      projectId: "project-1",
      donorSub: "donor-1",
      amountCents: 1000,
      currency: "PEN",
      status: "PENDIENTE_SIMULACION",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const handler = createGetDonationHandler(buildDonationsRepo([donation]));

    const result = await handler(
      buildEvent({
        pathParameters: { donationId: "donation-1" },
        authorizerClaims: GESTOR_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(403);
  });
});

describe("GET /v1/donations/me — HU-07 (CA-07.1)", () => {
  it("lista solo las donaciones del sub autenticado", async () => {
    const repo = buildDonationsRepo();
    await repo.create({ projectId: "project-1", amountCents: 1000, donorSub: "donor-1", idempotencyKey: "k1" });
    await repo.create({ projectId: "project-1", amountCents: 2000, donorSub: "donor-2", idempotencyKey: "k2" });
    const handler = createListMyDonationsHandler(repo);

    const result = await handler(
      buildEvent({ authorizerClaims: DONANTE_CLAIMS }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].donorSub).toBe("donor-1");
  });
});
