import { describe, expect, it } from "vitest";
import {
  createPreAuthenticationHandler,
  type CognitoAdminClient,
} from "../../src/authz/mfaEnforcement.js";
import type { PreAuthenticationTriggerEvent } from "aws-lambda";

/**
 * T051 / T14 (requirements.md §6, Fase 5) y T057 (HU-11, CA-11.1/CA-11.2): un Lambda trigger
 * PreAuthentication de Cognito bloquea el inicio de sesión de un usuario de los grupos GESTOR o
 * AUDITOR que no tenga MFA TOTP configurado — "no obtiene tokens" porque Cognito aborta el flujo
 * de autenticación completo cuando el trigger lanza un error, antes de verificar la contraseña.
 *
 * Límite honesto de esta prueba: se ejercita la lógica del trigger con un `CognitoAdminClient` en
 * memoria que modela el mismo contrato que las llamadas reales a `AdminListGroupsForUser` y
 * `AdminGetUser`. La verificación de extremo a extremo (un login real contra el Hosted UI
 * desplegado) requiere un usuario de prueba y credenciales de AWS no disponibles en esta sesión
 * (ver evidence/t051-mfa-gestor/README.md).
 */

function buildEvent(userName: string): PreAuthenticationTriggerEvent {
  return {
    version: "1",
    region: "us-east-2",
    userPoolId: "us-east-2_test",
    triggerSource: "PreAuthentication_Authentication",
    userName,
    callerContext: { awsSdkVersion: "test", clientId: "test-client" },
    request: { userAttributes: { sub: userName, email: `${userName}@example.com` } },
    response: {},
  };
}

function buildClient(
  groupsByUser: Record<string, string[]>,
  mfaByUser: Record<string, string[]>,
): CognitoAdminClient {
  return {
    async getUserGroups(_userPoolId, username) {
      return groupsByUser[username] ?? [];
    },
    async getUserMfaSettings(_userPoolId, username) {
      return mfaByUser[username] ?? [];
    },
  };
}

describe("T051/T14 — GESTOR sin MFA → no obtiene tokens (CA-11.2)", () => {
  it("rechaza (lanza error) el login de un GESTOR sin SOFTWARE_TOKEN_MFA configurado", async () => {
    const client = buildClient({ "manager-1": ["GESTOR"] }, { "manager-1": [] });
    const handler = createPreAuthenticationHandler(client);

    await expect(handler(buildEvent("manager-1"))).rejects.toThrow(/MFA/);
  });

  it("permite el login de un GESTOR con SOFTWARE_TOKEN_MFA configurado", async () => {
    const client = buildClient(
      { "manager-2": ["GESTOR"] },
      { "manager-2": ["SOFTWARE_TOKEN_MFA"] },
    );
    const handler = createPreAuthenticationHandler(client);

    const event = buildEvent("manager-2");
    const result = await handler(event);
    expect(result).toBe(event);
  });
});

describe("T057 — regla también aplica a AUDITOR (CA-11.1)", () => {
  it("rechaza el login de un AUDITOR sin MFA configurado", async () => {
    const client = buildClient({ "auditor-1": ["AUDITOR"] }, { "auditor-1": [] });
    const handler = createPreAuthenticationHandler(client);

    await expect(handler(buildEvent("auditor-1"))).rejects.toThrow(/MFA/);
  });
});

describe("DONANTE — MFA opcional, el trigger no bloquea (requirements.md §1)", () => {
  it("permite el login de un DONANTE sin MFA configurado", async () => {
    const client = buildClient({ "donor-1": ["DONANTE"] }, { "donor-1": [] });
    const handler = createPreAuthenticationHandler(client);

    const event = buildEvent("donor-1");
    await expect(handler(event)).resolves.toBe(event);
  });

  it("permite el login de un usuario sin ningún grupo asignado", async () => {
    const client = buildClient({}, {});
    const handler = createPreAuthenticationHandler(client);

    const event = buildEvent("visitor-1");
    await expect(handler(event)).resolves.toBe(event);
  });
});
