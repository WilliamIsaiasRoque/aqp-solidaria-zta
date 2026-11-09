import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { ApiError, toApiError, toErrorResponse } from "../shared/errors.js";
import { getAuthContext, requireGroup } from "../authz/context.js";
import { logEvent } from "../shared/logger.js";
import { dynamoDbDonationsRepository, type DonationsRepository } from "./repository.js";

/**
 * GET /v1/donations/{donationId} — solo propietario del grupo `DONANTE` (CA-07.2, prueba BOLA de
 * T09; CA-04.2, T12). Un `GESTOR` (sin el grupo `DONANTE`) recibe 403. Una donación inexistente o
 * de otro `sub` recibe 404 SIN distinguir la causa, para no revelar si existe (CA-07.2: "sin
 * revelar datos").
 *
 * Nota: esta ruta no figuraba en la tabla de endpoints de contracts/api.md (design.md §4 tampoco
 * la listaba); se agrega aquí porque CA-07.2/T09 exigen poder "consultar una donación" puntual, y
 * sin una ruta por `donationId` esa prueba de ownership no sería ejecutable contra el backend
 * real. Se documenta como corrección de una omisión de planificación, no como una funcionalidad
 * nueva fuera de alcance.
 */
export function createGetDonationHandler(repo: DonationsRepository) {
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

      if (!donation || donation.donorSub !== auth.sub) {
        throw new ApiError(404, "NOT_FOUND", "Donación no encontrada.");
      }

      const body = {
        donationId: donation.donationId,
        projectId: donation.projectId,
        donorSub: donation.donorSub,
        amountCents: donation.amountCents,
        currency: donation.currency,
        status: donation.status,
        createdAt: donation.createdAt,
      };

      logEvent({
        requestId,
        action: "donations.get",
        outcome: "success",
        httpStatus: 200,
        durationMs: Date.now() - start,
      });
      return { statusCode: 200, body: JSON.stringify(body) };
    } catch (error) {
      const apiError = toApiError(error);
      const response = toErrorResponse(apiError, requestId);
      logEvent({
        requestId,
        action: "donations.get",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createGetDonationHandler(dynamoDbDonationsRepository);
