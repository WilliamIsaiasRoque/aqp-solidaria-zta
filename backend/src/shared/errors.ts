/**
 * Formato uniforme de error, sin detalles internos (contracts/api.md "Convenciones generales";
 * design.md §4).
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function toErrorResponse(
  error: ApiError,
  requestId: string,
): { statusCode: number; body: string } {
  const body: ApiErrorBody = { code: error.code, message: error.message, requestId };
  return { statusCode: error.statusCode, body: JSON.stringify(body) };
}

/**
 * Traduce errores de dominio (authz/context.ts, validación Zod) a `ApiError` HTTP, sin acoplar
 * `shared` a `authz` por import directo: distingue por `error.name`, que cada error de dominio ya
 * fija en su constructor.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error && error.name === "UnauthorizedError") {
    return new ApiError(401, "UNAUTHORIZED", error.message);
  }
  if (error instanceof Error && error.name === "ForbiddenError") {
    return new ApiError(403, "FORBIDDEN", error.message);
  }
  if (error instanceof SyntaxError) {
    return new ApiError(400, "VALIDATION_ERROR", "JSON inválido.");
  }
  return new ApiError(500, "INTERNAL_ERROR", "Error interno.");
}
