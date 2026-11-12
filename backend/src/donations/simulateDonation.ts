import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { z } from "zod";
import { getAuthContext, requireGroup } from "../authz/context.js";
import { ApiError, toApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { dynamoDbDonationsRepository, type DonationsRepository } from "./repository.js";

const simulateBodySchema = z.object({
  outcome: z.enum(["CONFIRMADA_SIMULADA", "RECHAZADA_SIMULADA"]).default("CONFIRMADA_SIMULADA"),
});

/**
 * POST /v1/donations/{donationId}/simulate — solo grupo `DONANTE` propietario de la donación
 * (contracts/api.md; **solo existe en el stage `academic`**, condicionado en infra/template.yaml,
 * CA-06.1). Transición única desde `PENDIENTE_SIMULACION`: propiedad ajena → 403 (prueba BOLA);
 * donación inexistente → 404; ya resuelta (incluida una condición de carrera bajo concurrencia,
 * T08) → 409. `RECHAZADA_SIMULADA` nunca incrementa `confirmedAmountCents` (CA-06.3).
 */
export function createSimulateDonationHandler(repo: DonationsRepository) {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;

    try {
      const auth = getAuthContext(event);
      requireGroup(auth, "DONANTE");

      const donationId = event.pathParameters?.donationId;
      const donation = donationId ? await repo.getById(donationId) : undefined;
      if (!donation) {
        throw new ApiError(404, "NOT_FOUND", "Donación no encontrada.");
      }
      if (donation.donorSub !== auth.sub) {
        throw new ApiError(403, "FORBIDDEN", "No eres propietario de esta donación (CA-06.1).");
      }
      if (donation.status !== "PENDIENTE_SIMULACION") {
        throw new ApiError(409, "ALREADY_RESOLVED", "La donación ya fue resuelta.");
      }

      const parsed = simulateBodySchema.safeParse(
        event.body ? JSON.parse(event.body) : {},
      );
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues[0]?.message ?? "Entrada inválida.",
        );
      }

      const result = await repo.simulate({
        donationId: donation.donationId,
        donorSub: auth.sub,
        projectId: donation.projectId,
        amountCents: donation.amountCents,
        outcome: parsed.data.outcome,
      });

      if (!result.ok) {
        throw new ApiError(
          409,
          "ALREADY_RESOLVED",
          "La donación ya fue resuelta (condición de carrera, CA-06.2).",
        );
      }

      logEvent({
        requestId,
        action: "donations.simulate",
        outcome: "success",
        httpStatus: 200,
        durationMs: Date.now() - start,
      });
      return { statusCode: 200, body: JSON.stringify(result.donation) };
    } catch (error) {
      const apiError = toApiError(error);
      const response = toErrorResponse(apiError, requestId);
      logEvent({
        requestId,
        action: "donations.simulate",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createSimulateDonationHandler(dynamoDbDonationsRepository);
