import { InMemoryWebStorage, UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { UserManagerSettings } from "oidc-client-ts";

/**
 * Authorization Code + PKCE obligatorio (CA-03.1, requirements.md HU-03); no se usa el flujo
 * implícito. oidc-client-ts aplica PKCE automáticamente para `response_type: "code"`.
 *
 * Los tokens se mantienen SOLO en memoria (RNF-HU-11, CA-NF11.1): se usa `InMemoryWebStorage` en
 * lugar del `sessionStorage`/`localStorage` por defecto, de modo que un XSS no pueda leerlos desde
 * el almacenamiento persistente del navegador.
 */
export interface OidcEnvConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
}

export function createUserManager(config: OidcEnvConfig): UserManager {
  const settings: UserManagerSettings = {
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    post_logout_redirect_uri: config.postLogoutRedirectUri,
    response_type: "code",
    scope: config.scope,
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    automaticSilentRenew: false,
  };
  return new UserManager(settings);
}
