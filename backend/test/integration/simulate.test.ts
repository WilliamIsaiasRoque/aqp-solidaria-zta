import { describe, expect, it } from "vitest";
import { createSimulateDonationHandler } from "../../src/donations/simulateDonation.js";
import type { DonationRecord, DonationsRepository } from "../../src/donations/repository.js";

/**
 * T08 (requirements.md §6, Fase 5): 10 confirmaciones concurrentes de la misma donación → un solo
 * incremento (CA-06.2, RNF-HU-04 CA-NF04.1). También cubre CA-06.1 (propiedad, transición solo
 * desde PENDIENTE_SIMULACION) y CA-06.3 (RECHAZADA_SIMULADA no incrementa el agregado).
 *
 * Igual que en las fases anteriores: se prueba la lógica del handler con un repositorio en
 * memoria que modela la MISMA garantía de atomicidad que `TransactWriteItems` condicionado (la
 * comprobación de estado y la escritura ocurren sin ningún `await` entre medio, igual que un
 * `UpdateItem` condicionado real resuelve la carrera en el servidor de DynamoDB, no en el
 * cliente). La verificación de extremo a extremo contra el stage desplegado se documenta por
 * separado, una vez desplegada esta fase.
 */

function buildDonation(overrides: Partial<DonationRecord> = {}): DonationRecord {
  const now = new Date().toISOString();
  return {
    donationId: "donation-1",
    projectId: "project-1",
    donorSub: "donor-1",
    amountCents: 1000,
    currency: "PEN",
    status: "PENDIENTE_SIMULACION",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Repositorio en memoria: `simulate` hace el chequeo-y-mutación en un solo tramo síncrono (sin
 * `await` antes de escribir), replicando la atomicidad de un `UpdateItem` condicionado real. El
 * acumulado del proyecto se modela aparte, como haría la segunda escritura del mismo
 * `TransactWriteItems`.
 */
function buildRepo(seedDonation: DonationRecord) {
  const donations = new Map<string, DonationRecord>([[seedDonation.donationId, seedDonation]]);
  let confirmedAmountCents = 0;
  let projectUpdateCount = 0;

  const repo: Pick<DonationsRepository, "getById" | "simulate"> = {
    async getById(donationId) {
      return donations.get(donationId);
    },
    async simulate(input) {
      const donation = donations.get(input.donationId);
      if (!donation || donation.status !== "PENDIENTE_SIMULACION" || donation.donorSub !== input.donorSub) {
        return { ok: false, reason: "ALREADY_RESOLVED" };
      }
      // Punto atómico: ninguna operación asíncrona entre leer el estado y escribirlo.
      const updated: DonationRecord = {
        ...donation,
        status: input.outcome,
        updatedAt: new Date().toISOString(),
      };
      donations.set(donation.donationId, updated);
      if (input.outcome === "CONFIRMADA_SIMULADA") {
        confirmedAmountCents += input.amountCents;
        projectUpdateCount += 1;
      }
      return { ok: true, donation: updated };
    },
  };

  return {
    repo: repo as DonationsRepository,
    getConfirmedAmountCents: () => confirmedAmountCents,
    getProjectUpdateCount: () => projectUpdateCount,
    getDonation: () => donations.get(seedDonation.donationId)!,
  };
}

function buildEvent(options: {
  pathParameters?: Record<string, string>;
  body?: unknown;
  authorizerClaims?: Record<string, unknown>;
}) {
  return {
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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

describe("POST /v1/donations/{donationId}/simulate — CA-06.1", () => {
  it("transiciona una donación propia PENDIENTE_SIMULACION a CONFIRMADA_SIMULADA (200)", async () => {
    const { repo, getConfirmedAmountCents } = buildRepo(buildDonation());
    const handler = createSimulateDonationHandler(repo);

    const result = await handler(
      buildEvent({
        pathParameters: { donationId: "donation-1" },
        body: { outcome: "CONFIRMADA_SIMULADA" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string).status).toBe("CONFIRMADA_SIMULADA");
    expect(getConfirmedAmountCents()).toBe(1000);
  });

  it("rechaza con 403 si la donación no pertenece al llamante", async () => {
    const { repo } = buildRepo(buildDonation());
    const handler = createSimulateDonationHandler(repo);

    const result = await handler(
      buildEvent({
        pathParameters: { donationId: "donation-1" },
        authorizerClaims: OTHER_DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(403);
  });

  it("rechaza con 404 si la donación no existe", async () => {
    const { repo } = buildRepo(buildDonation());
    const handler = createSimulateDonationHandler(repo);

    const result = await handler(
      buildEvent({
        pathParameters: { donationId: "no-existe" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(404);
  });

  it("rechaza con 409 una transición repetida (la donación ya no está PENDIENTE_SIMULACION)", async () => {
    const { repo } = buildRepo(buildDonation({ status: "CONFIRMADA_SIMULADA" }));
    const handler = createSimulateDonationHandler(repo);

    const result = await handler(
      buildEvent({
        pathParameters: { donationId: "donation-1" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(409);
  });
});

describe("CA-06.3 — RECHAZADA_SIMULADA no incrementa el agregado", () => {
  it("transiciona a RECHAZADA_SIMULADA sin tocar confirmedAmountCents", async () => {
    const { repo, getConfirmedAmountCents, getProjectUpdateCount } = buildRepo(buildDonation());
    const handler = createSimulateDonationHandler(repo);

    const result = await handler(
      buildEvent({
        pathParameters: { donationId: "donation-1" },
        body: { outcome: "RECHAZADA_SIMULADA" },
        authorizerClaims: DONANTE_CLAIMS,
      }) as Parameters<typeof handler>[0],
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string).status).toBe("RECHAZADA_SIMULADA");
    expect(getConfirmedAmountCents()).toBe(0);
    expect(getProjectUpdateCount()).toBe(0);
  });
});

describe("T08 — 10 confirmaciones concurrentes de la misma donación → un solo incremento (CA-06.2, CA-NF04.1)", () => {
  it("solo una de 10 solicitudes paralelas modifica el acumulado", async () => {
    const { repo, getConfirmedAmountCents, getDonation } = buildRepo(buildDonation());
    const handler = createSimulateDonationHandler(repo);

    const event = buildEvent({
      pathParameters: { donationId: "donation-1" },
      body: { outcome: "CONFIRMADA_SIMULADA" },
      authorizerClaims: DONANTE_CLAIMS,
    }) as Parameters<typeof handler>[0];

    const results = await Promise.all(Array.from({ length: 10 }, () => handler(event)));

    const successes = results.filter((r) => r.statusCode === 200);
    const conflicts = results.filter((r) => r.statusCode === 409);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
    expect(getConfirmedAmountCents()).toBe(1000); // un solo incremento, no 10
    expect(getDonation().status).toBe("CONFIRMADA_SIMULADA");
  });
});
