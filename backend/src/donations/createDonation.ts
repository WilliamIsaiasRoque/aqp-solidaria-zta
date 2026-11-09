import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { getAuthContext, requireGroup } from "../authz/context.js";
import { ApiError, toApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { createDonationSchema } from "../shared/schemas.js";
import { dynamoDbProjectsRepository, type ProjectsRepository } from "../projects/repository.js";
import { dynamoDbDonationsRepository, type DonationsRepository } from "./repository.js";

/**
 * POST /v1/donations — solo grupo `DONANTE` (scope `api/donations.write`, contracts/api.md).
 * CA-05.1/CA-05.2: proyecto `PUBLICADO` y `amountCents` válido; CA-05.3: `donorSub` solo del
 * contexto del authorizer; CA-05.4: idempotencia atómica (ver `repository.ts`); CA-05.5: nunca se
 * solicitan datos de pago reales (el body no admite ningún campo de tarjeta/cuenta/DNI).
 */
export function createCreateDonationHandler(
  donations: DonationsRepository,
  projects: ProjectsRepository,
) {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;

    try {
      const auth = getAuthContext(event);
      requireGroup(auth, "DONANTE");

      const idempotencyKey = readIdempotencyKey(event.headers);
      if (!idempotencyKey) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "La cabecera Idempotency-Key (UUID) es obligatoria (CA-05.2).",
        );
      }

      const parsed = createDonationSchema.safeParse(
        event.body ? JSON.parse(event.body) : undefined,
      );
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Entrada inválida.",
        );
      }

      const project = await projects.getById(parsed.data.projectId);
      if (!project) {
        throw new ApiError(404, "NOT_FOUND", "Proyecto no encontrado.");
      }
      if (project.status !== "PUBLICADO") {
        throw new ApiError(409, "PROJECT_NOT_PUBLISHED", "El proyecto no está publicado.");
      }

      const result = await donations.create({
        projectId: parsed.data.projectId,
        amountCents: parsed.data.amountCents,
        donorSub: auth.sub,
        idempotencyKey,
      });

      if (result.outcome === "conflict") {
        throw new ApiError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "La clave de idempotencia ya se usó con una carga distinta (CA-05.4).",
        );
      }

      logEvent({
        requestId,
        action: "donations.create",
        outcome: "success",
        httpStatus: 201,
        durationMs: Date.now() - start,
      });
      return { statusCode: 201, body: JSON.stringify(result.donation) };
    } catch (error) {
      const apiError = toApiError(error);
      const response = toErrorResponse(apiError, requestId);
      logEvent({
        requestId,
        action: "donations.create",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

function readIdempotencyKey(headers: Record<string, string | undefined> | undefined): string | undefined {
  if (!headers) return undefined;
  return headers["idempotency-key"] ?? headers["Idempotency-Key"];
}

export const handler = createCreateDonationHandler(
  dynamoDbDonationsRepository,
  dynamoDbProjectsRepository,
);
