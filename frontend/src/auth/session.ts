import type { UserManager } from "oidc-client-ts";

/**
 * Cierre de sesión (CA-03.3, requirements.md HU-03): elimina los tokens de memoria y revoca el
 * refresh token vía el endpoint `/oauth2/revoke` de Cognito.
 */
export interface RevokeConfig {
  /** Dominio hosted UI de Cognito, p. ej. https://<dominio>.auth.us-east-2.amazoncognito.com */
  cognitoDomain: string;
  clientId: string;
}

export async function logout(userManager: UserManager, revokeConfig: RevokeConfig): Promise<void> {
  const user = await userManager.getUser();
  const refreshToken = user?.refresh_token;

  await userManager.removeUser();

  if (refreshToken) {
    await revokeRefreshToken(revokeConfig, refreshToken);
  }
}

async function revokeRefreshToken(config: RevokeConfig, refreshToken: string): Promise<void> {
  const endpoint = `${config.cognitoDomain}/oauth2/revoke`;
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refreshToken, client_id: config.clientId }).toString(),
  });
}
