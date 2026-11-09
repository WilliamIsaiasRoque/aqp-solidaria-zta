/**
 * Logging estructurado JSON (RNF-HU-07, CA-NF07.1): requestId, acción, resultado, código HTTP y
 * duración. La retención de logs (≤ 14 días) se configura en infra/template.yaml, no aquí.
 */
export interface LogEvent {
  requestId: string;
  action: string;
  outcome: "success" | "error";
  httpStatus: number;
  durationMs: number;
  [key: string]: unknown;
}

export function logEvent(event: LogEvent): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...event }));
}
