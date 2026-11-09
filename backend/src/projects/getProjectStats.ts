import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { ApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { dynamoDbProjectsRepository, type ProjectsRepository } from "./repository.js";

/**
 * GET /v1/projects/{projectId}/stats — público (contracts/api.md, HU-09). `confirmedAmountCents`
 * solo se incrementa por una transición de simulación válida (Fase 5, CA-06.2), por lo que ya
 * excluye por invariante los estados `PENDIENTE_SIMULACION` y `RECHAZADA_SIMULADA` (CA-09.1). No se
 * expone ningún identificador de donante ni registro individual (CA-09.2).
 */
export function createGetProjectStatsHandler(repo: ProjectsRepository) {
  return async (
    event: APIGatewayProxyEventV2,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;
    const projectId = event.pathParameters?.projectId;

    try {
      const project = projectId ? await repo.getById(projectId) : undefined;
      if (!project || project.status !== "PUBLICADO") {
        const response = toErrorResponse(
          new ApiError(404, "NOT_FOUND", "Proyecto no encontrado."),
          requestId,
        );
        logEvent({
          requestId,
          action: "projects.stats",
          outcome: "error",
          httpStatus: response.statusCode,
          durationMs: Date.now() - start,
        });
        return response;
      }

      const body = {
        projectId: project.projectId,
        goalAmountCents: project.goalAmountCents,
        confirmedAmountCents: project.confirmedAmountCents,
        currency: project.currency,
      };
      logEvent({
        requestId,
        action: "projects.stats",
        outcome: "success",
        httpStatus: 200,
        durationMs: Date.now() - start,
      });
      return { statusCode: 200, body: JSON.stringify(body) };
    } catch {
      const response = toErrorResponse(
        new ApiError(500, "INTERNAL_ERROR", "Error interno."),
        requestId,
      );
      logEvent({
        requestId,
        action: "projects.stats",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createGetProjectStatsHandler(dynamoDbProjectsRepository);
