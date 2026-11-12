import { describe, expect, it } from "vitest";
import { handler } from "../../src/authz/authCheck.js";

/**
 * T02 y T11 (requirements.md §6) contra el módulo authz foundational de la Fase 2.
 *
 * Límite honesto de esta prueba: en el stage desplegado, el JWT authorizer de API Gateway (PEP,
 * design.md §6.1) rechaza con 401 nativo las solicitudes sin token, con firma inválida o alteradas,
 * ANTES de que Lambda se invoque — esa verificación de firma no es simulable localmente sin Cognito
 * real. Esta prueba valida la capa de defensa adicional en el propio Lambda (Principio constitucional
 * II — Backend autoritativo: nunca confiar únicamente en un control upstream), que debe rechazar
 * también un contexto de autorización ausente o un ID token usado como credencial. La verificación de
 * extremo a extremo contra el stage real está en quickstart.md, Escenario 2.
 */

function buildEvent(authorizerClaims?: Record<string, unknown>) {
  return {
    requestContext: {
      requestId: "test-request-id",
      authorizer: authorizerClaims
        ? { jwt: { claims: authorizerClaims, scopes: [] } }
        : undefined,
    },
  } as unknown as Parameters<typeof handler>[0];
}

describe("T02 — sin token verificado → 401 (defensa adicional en Lambda)", () => {
  it("responde 401 cuando no hay contexto de authorizer", async () => {
    const result = await handler(buildEvent(undefined));
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body as string);
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.requestId).toBe("test-request-id");
  });
});

describe("T11 — ID token o token sin claims válidos usado como Bearer → 401", () => {
  it("responde 401 cuando token_use es 'id' en vez de 'access'", async () => {
    const result = await handler(
      buildEvent({ sub: "user-1", token_use: "id", "cognito:groups": ["DONANTE"] }),
    );
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body as string);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("responde 401 cuando falta el claim 'sub'", async () => {
    const result = await handler(buildEvent({ token_use: "access" }));
    expect(result.statusCode).toBe(401);
  });
});

describe("Caso positivo — access token válido con claims verificados", () => {
  it("responde 200 y deriva sub/groups exclusivamente de los claims verificados (CA-04.3)", async () => {
    const result = await handler(
      buildEvent({ sub: "user-42", token_use: "access", "cognito:groups": ["DONANTE"] }),
    );
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body).toEqual({ sub: "user-42", groups: ["DONANTE"] });
  });
});

/**
 * T13 (requirements.md §6, Fase 5): "Token revocado usado antes de expirar → aceptado hasta
 * expirar (limitación documentada); rechazado después". La revocación de un access token NO es un
 * claim verificable localmente (ni por el JWT authorizer de API Gateway ni por este Lambda): un
 * token revocado sigue teniendo claims válidos hasta que expira. Por eso:
 *
 * - "Aceptado hasta expirar": se demuestra con el caso positivo de arriba (CA-04.3) — cualquier
 *   claim-set con `exp` vigente se acepta, sin excepción para un hipotético estado de revocación
 *   (no hay ningún campo "revoked" que inspeccionar). La mitigación es la vida corta del access
 *   token (≤ 15 min, CA-03.3), no una verificación de revocación.
 * - "Rechazado después" (de expirar): SÍ es verificable como defensa adicional en el propio Lambda
 *   (Principio constitucional II): `getAuthContext` valida `exp` contra la hora actual y rechaza
 *   un token ya expirado, sin esperar a que lo haga únicamente el JWT authorizer de API Gateway.
 */
describe("T13 — límite de revocación: aceptado hasta expirar, rechazado después (CA-03.4)", () => {
  it("acepta un token con 'exp' vigente, aunque fuese revocado (no es un claim verificable)", async () => {
    const expInFuture = Math.floor(Date.now() / 1000) + 600; // 10 minutos en el futuro
    const result = await handler(
      buildEvent({
        sub: "user-42",
        token_use: "access",
        "cognito:groups": ["DONANTE"],
        exp: expInFuture,
      }),
    );
    expect(result.statusCode).toBe(200);
  });

  it("rechaza con 401 un token cuyo 'exp' ya pasó (defensa adicional, Principio II)", async () => {
    const expInPast = Math.floor(Date.now() / 1000) - 60; // 1 minuto en el pasado
    const result = await handler(
      buildEvent({
        sub: "user-42",
        token_use: "access",
        "cognito:groups": ["DONANTE"],
        exp: expInPast,
      }),
    );
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body as string);
    expect(body.code).toBe("UNAUTHORIZED");
  });
});
