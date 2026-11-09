import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { ApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { dynamoDbProjectsRepository, type ProjectsRepository } from "./repository.js";

/**
 * GET /v1/projects/{projectId} — público, solo `PUBLICADO` (contracts/api.md, CA-02.1). Un
 * identificador inexistente o un proyecto `BORRADOR` devuelve 404 sin revelar contenido (CA-02.2):
 * la respuesta es idéntica en ambos casos.
 */
export function createGetProjectHandler(repo: ProjectsRepository) {
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
          action: "projects.get",
          outcome: "error",
          httpStatus: response.statusCode,
          durationMs: Date.now() - start,
        });
        return response;
      }

      const body = {
        projectId: project.projectId,
        title: project.title,
        description: project.description,
        goalAmountCents: project.goalAmountCents,
        confirmedAmountCents: project.confirmedAmountCents,
        currency: project.currency,
        status: project.status,
      };
      logEvent({
        requestId,
        action: "projects.get",
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
        action: "projects.get",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createGetProjectHandler(dynamoDbProjectsRepository);
