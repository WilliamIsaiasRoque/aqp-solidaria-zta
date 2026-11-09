import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { getAuthContext, requireGroup } from "../authz/context.js";
import { dynamoDbAuditRepository, type AuditRepository } from "../audit/recordEvent.js";
import { ApiError, toApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { dynamoDbProjectsRepository, type ProjectsRepository } from "./repository.js";

/**
 * PATCH /v1/projects/{projectId}/publish — solo grupo `GESTOR` (CA-08.2). Un `BORRADOR` válido
 * pasa a `PUBLICADO`; publicar uno ya `PUBLICADO` devuelve 409; un `projectId` inexistente, 404.
 */
export function createPublishProjectHandler(repo: ProjectsRepository, audit: AuditRepository) {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;

    try {
      const auth = getAuthContext(event);
      requireGroup(auth, "GESTOR");

      const projectId = event.pathParameters?.projectId;
      if (!projectId) {
        throw new ApiError(404, "NOT_FOUND", "Proyecto no encontrado.");
      }

      const result = await repo.publish(projectId);
      if (!result.ok) {
        const statusCode = result.reason === "NOT_FOUND" ? 404 : 409;
        const code = result.reason === "NOT_FOUND" ? "NOT_FOUND" : "ALREADY_PUBLISHED";
        throw new ApiError(statusCode, code, "No se pudo publicar el proyecto.");
      }

      await audit.record({
        action: "project.publish",
        actorRef: auth.sub,
        resourceRef: projectId,
        outcome: "success",
        requestId,
      });

      logEvent({
        requestId,
        action: "projects.publish",
        outcome: "success",
        httpStatus: 200,
        durationMs: Date.now() - start,
      });
      return { statusCode: 200, body: JSON.stringify(result.project) };
    } catch (error) {
      const apiError = toApiError(error);
      const response = toErrorResponse(apiError, requestId);
      logEvent({
        requestId,
        action: "projects.publish",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createPublishProjectHandler(dynamoDbProjectsRepository, dynamoDbAuditRepository);
