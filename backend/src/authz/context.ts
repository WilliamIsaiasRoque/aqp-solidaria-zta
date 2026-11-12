import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

/**
 * Deriva `sub` y `cognito:groups` EXCLUSIVAMENTE de los claims ya verificados por el JWT authorizer
 * de API Gateway (CA-04.3, RNF-HU-02 CA-NF02.2) — nunca de campos enviados por el cliente.
 *
 * También aplica, como defensa adicional dentro del propio Lambda (Principio constitucional II —
 * Backend autoritativo), el rechazo de un contexto de autorización ausente o de un ID token usado
 * como credencial (CA-03.2). La verificación de firma/expiración/`client_id` y de scopes ocurre en
 * el JWT authorizer de API Gateway (PEP) antes de invocar este Lambda; eso no es simulable sin un
 * despliegue real (ver backend/test/integration/auth.test.ts y quickstart.md, Escenario 2).
 */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * RBAC por `cognito:groups` (CA-04.1, CA-04.2): un rol sin el grupo requerido recibe 403, nunca 401.
 * Se valida siempre en backend, nunca confiando en lo que oculte o muestre la UI (Principio
 * constitucional II).
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireGroup(auth: AuthContext, group: string): void {
  if (!auth.groups.includes(group)) {
    throw new ForbiddenError(`Se requiere el grupo '${group}' para esta operación.`);
  }
}

export interface AuthContext {
  sub: string;
  groups: string[];
}

export function getAuthContext(event: APIGatewayProxyEventV2WithJWTAuthorizer): AuthContext {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims) {
    throw new UnauthorizedError(
      "Falta el contexto de autorización verificado por el JWT authorizer.",
    );
  }

  if (claims.token_use !== "access") {
    throw new UnauthorizedError(
      "Se requiere un access token; un ID token no es una credencial válida (CA-03.2).",
    );
  }

  // `exp` es opcional aquí solo por compatibilidad con fixtures de prueba de fases anteriores que
  // no lo incluían; un access token real de Cognito siempre lo trae. Cuando está presente, se
  // valida como defensa adicional (Principio II) — el JWT authorizer de API Gateway ya lo exige
  // igualmente antes de invocar este Lambda.
  if (claims.exp !== undefined) {
    const exp = typeof claims.exp === "number" ? claims.exp : Number(claims.exp);
    if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedError(
        "El token verificado ya expiró (CA-03.4). La revocación en sí no es un claim " +
          "verificable localmente — ver limitación documentada en docs/threat-model.md.",
      );
    }
  }

  const sub = typeof claims.sub === "string" ? claims.sub : undefined;
  if (!sub) {
    throw new UnauthorizedError("El claim 'sub' no está presente en el token verificado.");
  }

  const rawGroups = claims["cognito:groups"];
  const groups = Array.isArray(rawGroups)
    ? rawGroups.map(String)
    : typeof rawGroups === "string"
      ? parseGroupsClaim(rawGroups)
      : [];

  return { sub, groups };
}

/** Cognito puede serializar el claim como el literal "[GESTOR AUDITOR]" en algunos formatos. */
function parseGroupsClaim(raw: string): string[] {
  return raw
    .replace(/^\[|\]$/g, "")
    .split(/\s+/)
    .filter(Boolean);
}
