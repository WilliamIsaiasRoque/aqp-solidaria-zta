import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { User } from "oidc-client-ts";
import { createUserManager } from "./oidc.js";
import { logout as revokeAndClear } from "./session.js";

const region = "us-east-2";
const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || "us-east-2_caprohzIP";
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || "46biqan84afjjvg3gkqnbaf91";
const domain =
  import.meta.env.VITE_COGNITO_DOMAIN ||
  "https://aqp-solidaria-zta-2026.auth.us-east-2.amazoncognito.com";
const origin = typeof window === "undefined" ? "http://localhost:5173" : window.location.origin;

function readGroups(token: string | undefined): string[] {
  if (!token) return [];
  try {
    const payload = token.split(".")[1];
    if (!payload) return [];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<
      string,
      unknown
    >;
    return Array.isArray(decoded["cognito:groups"])
      ? decoded["cognito:groups"].filter((group): group is string => typeof group === "string")
      : [];
  } catch {
    return [];
  }
}

interface AuthState {
  user: User | null;
  groups: string[];
  login: () => Promise<void>;
  finishLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const manager = useMemo(
    () =>
      createUserManager({
        authority: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
        clientId,
        redirectUri: `${origin}/callback`,
        postLogoutRedirectUri: `${origin}/logout`,
        scope: "openid email profile api/projects.write api/donations.write api/donations.read",
      }),
    [],
  );

  const login = useCallback(() => manager.signinRedirect(), [manager]);
  const finishLogin = useCallback(async () => {
    const result = await manager.signinRedirectCallback();
    setUser(result);
  }, [manager]);
  const logout = useCallback(async () => {
    try {
      await revokeAndClear(manager, { cognitoDomain: domain, clientId });
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        const url = new URL("/logout", domain);
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("logout_uri", `${origin}/logout`);
        window.location.assign(url.toString());
      }
    }
  }, [manager]);

  return (
    <AuthContext.Provider
      value={{ user, groups: readGroups(user?.access_token), login, finishLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider no disponible");
  return context;
}
