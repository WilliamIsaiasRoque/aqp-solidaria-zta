import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "../../src/auth/session.js";

/**
 * CA-03.3 (requirements.md §6, HU-03): al cerrar sesión, la SPA elimina los tokens de memoria y
 * revoca el refresh token (`/oauth2/revoke` o `RevokeToken`).
 */
describe("logout — CA-03.3", () => {
  const revokeConfig = {
    cognitoDomain: "https://example.auth.us-east-2.amazoncognito.com",
    clientId: "test-client-id",
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("elimina los tokens de memoria (removeUser) y revoca el refresh token si existe", async () => {
    const removeUser = vi.fn().mockResolvedValue(undefined);
    const getUser = vi.fn().mockResolvedValue({ refresh_token: "refresh-abc" });
    const userManager = { getUser, removeUser } as unknown as Parameters<typeof logout>[0];

    await logout(userManager, revokeConfig);

    expect(removeUser).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.auth.us-east-2.amazoncognito.com/oauth2/revoke",
      expect.objectContaining({ method: "POST" }),
    );
    const [, options] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(String(options.body)).toContain("refresh-abc");
  });

  it("no intenta revocar si no hay refresh token, pero sí elimina los tokens de memoria", async () => {
    const removeUser = vi.fn().mockResolvedValue(undefined);
    const getUser = vi.fn().mockResolvedValue(null);
    const userManager = { getUser, removeUser } as unknown as Parameters<typeof logout>[0];

    await logout(userManager, revokeConfig);

    expect(removeUser).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});
