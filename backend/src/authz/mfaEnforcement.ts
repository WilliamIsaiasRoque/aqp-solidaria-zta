import type { PreAuthenticationTriggerEvent } from "aws-lambda";
import {
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * Lambda trigger PreAuthentication de Cognito (T057, HU-11, CA-11.1/CA-11.2): bloquea POR
 * COMPLETO el inicio de sesión — antes de validar la contraseña, sin emitir ningún token — de un
 * usuario de los grupos `GESTOR` o `AUDITOR` que no tenga `SOFTWARE_TOKEN_MFA` configurado.
 *
 * Cognito invoca este trigger en cada intento de autenticación (`InitiateAuth`/
 * `AdminInitiateAuth`); cualquier `Error` lanzado aquí aborta el flujo completo (el llamante no
 * recibe tokens, T14/T051). Resuelve la limitación documentada en docs/threat-model.md
 * ("MFA por grupo"): `MfaConfiguration` de Cognito es por pool, no por grupo, así que la
 * exigencia por grupo se implementa aquí, en el propio flujo de autenticación.
 */
export interface CognitoAdminClient {
  getUserGroups(userPoolId: string, username: string): Promise<string[]>;
  getUserMfaSettings(userPoolId: string, username: string): Promise<string[]>;
}

const MFA_REQUIRED_GROUPS = ["GESTOR", "AUDITOR"];

/**
 * Tipo del handler más simple que el `Handler<Event, Result>` genérico de `aws-lambda` (que exige
 * `context`/`callback` posicionales): Lambda invoca igual una función `async (event) => result`
 * con esta forma, ignorando los parámetros adicionales que no se declaran.
 */
export type PreAuthenticationHandler = (
  event: PreAuthenticationTriggerEvent,
) => Promise<PreAuthenticationTriggerEvent>;

export function createPreAuthenticationHandler(
  client: CognitoAdminClient,
): PreAuthenticationHandler {
  return async (event: PreAuthenticationTriggerEvent) => {
    const groups = await client.getUserGroups(event.userPoolId, event.userName);
    const requiresMfa = groups.some((group) => MFA_REQUIRED_GROUPS.includes(group));

    if (requiresMfa) {
      const mfaSettings = await client.getUserMfaSettings(event.userPoolId, event.userName);
      if (!mfaSettings.includes("SOFTWARE_TOKEN_MFA")) {
        throw new Error(
          "MFA_REQUIRED: los usuarios de los grupos GESTOR y AUDITOR deben tener MFA TOTP " +
            "configurado antes de iniciar sesión (CA-11.1, CA-11.2).",
        );
      }
    }

    return event;
  };
}

const cognitoClient = new CognitoIdentityProviderClient({});

const realClient: CognitoAdminClient = {
  async getUserGroups(userPoolId, username) {
    const result = await cognitoClient.send(
      new AdminListGroupsForUserCommand({ UserPoolId: userPoolId, Username: username }),
    );
    return (result.Groups ?? []).map((group) => group.GroupName ?? "").filter(Boolean);
  },

  async getUserMfaSettings(userPoolId, username) {
    const result = await cognitoClient.send(
      new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }),
    );
    return result.UserMFASettingList ?? [];
  },
};

export const handler = createPreAuthenticationHandler(realClient);
