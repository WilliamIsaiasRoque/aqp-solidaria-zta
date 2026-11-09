import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { getAuthContext, requireGroup } from "../authz/context.js";
import { toApiError, toErrorResponse } from "../shared/errors.js";
import { logEvent } from "../shared/logger.js";
import { dynamoDbDonationsRepository, type DonationsRepository } from "./repository.js";

/**
 * GET /v1/donations/me — solo grupo `DONANTE` (scope `api/donations.read`, contracts/api.md).
 * CA-07.1: solo registros del `sub` autenticado, con fecha/importe/proyecto/estado. CA-04.2: un
 * `GESTOR` (sin el grupo `DONANTE`) recibe 403.
 */
export function createListMyDonationsHandler(repo: DonationsRepository) {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;

    try {
      const auth = getAuthContext(event);
      requireGroup(auth, "DONANTE");

      const donations = await repo.listByDonor(auth.sub);
      const body = {
        items: donations.map((d) => ({
          donationId: d.donationId,
          projectId: d.projectId,
          donorSub: d.donorSub,
          amountCents: d.amountCents,
          currency: d.currency,
          status: d.status,
          createdAt: d.createdAt,
        })),
      };

      logEvent({
        requestId,
        action: "donations.listMine",
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
        action: "donations.listMine",
        outcome: "error",
        httpStatus: response.statusCode,
        durationMs: Date.now() - start,
      });
      return response;
    }
  };
}

export const handler = createListMyDonationsHandler(dynamoDbDonationsRepository);
