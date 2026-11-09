import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { ApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { dynamoDbProjectsRepository, type ProjectsRepository } from "./repository.js";

/**
 * GET /v1/projects — público (contracts/api.md). Solo proyectos `PUBLICADO` (CA-01.1, CA-01.2);
 * si no hay ninguno, responde 200 con una lista vacía, sin errores técnicos (CA-01.3).
 */
export function createListProjectsHandler(repo: ProjectsRepository) {
  return async (
    event: APIGatewayProxyEventV2,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;

    try {
      const projects = await repo.listPublished();
      const body = {
        items: projects.map((project) => ({
          projectId: project.projectId,
          title: project.title,
          description: project.description,
          goalAmountCents: project.goalAmountCents,
          confirmedAmountCents: project.confirmedAmountCents,
          currency: project.currency,
          status: project.status,
        })),
      };
      logEvent({
        requestId,
        action: "projects.list",
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
        action: "projects.list",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createListProjectsHandler(dynamoDbProjectsRepository);
