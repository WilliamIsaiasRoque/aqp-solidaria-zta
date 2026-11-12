// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { User } from "oidc-client-ts";
import { createUserManager } from "../../src/auth/oidc.js";

const config = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_test",
  clientId: "test-spa",
  redirectUri: "http://127.0.0.1:5173/callback",
  postLogoutRedirectUri: "http://127.0.0.1:5173/logout",
  scope: "openid email",
};

describe("OIDC de la SPA", () => {
  it("usa Authorization Code y pierde los tokens al recrear la aplicación", async () => {
    const first = createUserManager(config);
    expect(first.settings.response_type).toBe("code");
    await first.storeUser(
      new User({
        access_token: "solo-en-memoria",
        token_type: "Bearer",
        profile: {
          sub: "demo",
          exp: 9999999999,
          iss: config.authority,
          aud: config.clientId,
          iat: 0,
        },
      }),
    );
    expect((await first.getUser())?.access_token).toBe("solo-en-memoria");
    expect(window.localStorage.length).toBe(0);
    const afterReload = createUserManager(config);
    expect(await afterReload.getUser()).toBeNull();
  });
});
