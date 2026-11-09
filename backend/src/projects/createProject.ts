import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { getAuthContext, requireGroup } from "../authz/context.js";
import { dynamoDbAuditRepository, type AuditRepository } from "../audit/recordEvent.js";
import { ApiError, toApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { createProjectSchema } from "../shared/schemas.js";
import { dynamoDbProjectsRepository, type ProjectsRepository } from "./repository.js";

/**
 * POST /v1/projects — solo grupo `GESTOR` (scope `api/projects.write`, contracts/api.md). Un
 * donante (u otro rol sin `GESTOR`) recibe 403 (CA-04.1). Crea el proyecto en `BORRADOR` (CA-08.1)
 * y registra un `AuditEvent` (CA-08.3). El `donorSub`/actor se obtiene exclusivamente del contexto
 * verificado del authorizer, nunca del body (Principio constitucional II).
 */
export function createCreateProjectHandler(repo: ProjectsRepository, audit: AuditRepository) {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;

    try {
      const auth = getAuthContext(event);
      requireGroup(auth, "GESTOR");

      const parsed = createProjectSchema.safeParse(
        event.body ? JSON.parse(event.body) : undefined,
      );
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Entrada inválida.");
      }

      const project = await repo.create(parsed.data);
      await audit.record({
        action: "project.create",
        actorRef: auth.sub,
        resourceRef: project.projectId,
        outcome: "success",
        requestId,
      });

      logEvent({
        requestId,
        action: "projects.create",
        outcome: "success",
        httpStatus: 201,
        durationMs: Date.now() - start,
      });
      return { statusCode: 201, body: JSON.stringify(project) };
    } catch (error) {
      const apiError = toApiError(error);
      const response = toErrorResponse(apiError, requestId);
      logEvent({
        requestId,
        action: "projects.create",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createCreateProjectHandler(dynamoDbProjectsRepository, dynamoDbAuditRepository);
