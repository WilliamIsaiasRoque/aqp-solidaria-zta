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
