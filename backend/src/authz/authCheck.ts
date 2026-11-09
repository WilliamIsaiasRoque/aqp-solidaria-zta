import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { ApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { getAuthContext, UnauthorizedError } from "./context.js";

/**
 * Lambda foundational de la Fase 2 (T013/T016), sin tabla DynamoDB asociada (least privilege, T015):
 * existe únicamente para verificar en el stage desplegado que el JWT authorizer (PEP) y el módulo
 * `authz` rechazan solicitudes sin token o con un ID token (T02, T11 — requirements.md §6), antes de
 * que existan los endpoints de negocio reales (Fase 3+). Ruta: GET /v1/_internal/authcheck
 * (infra/template.yaml), con scope dedicado `api/system.authcheck` para forzar la validación de
 * scopes exigida por CA-NF02.1.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const start = Date.now();
  const requestId = event.requestContext.requestId;

  try {
    const auth = getAuthContext(event);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ sub: auth.sub, groups: auth.groups }),
    };
    logEvent({
      requestId,
      action: "authcheck",
      outcome: "success",
      httpStatus: response.statusCode,
      durationMs: Date.now() - start,
    });
    return response;
  } catch (error) {
    const apiError =
      error instanceof UnauthorizedError
        ? new ApiError(401, "UNAUTHORIZED", error.message)
        : new ApiError(500, "INTERNAL_ERROR", "Error interno.");
    const response = toErrorResponse(apiError, requestId);
    logEvent({
      requestId,
      action: "authcheck",
      outcome: "error",
      httpStatus: response.statusCode,
      durationMs: Date.now() - start,
    });
    return response;
  }
};
