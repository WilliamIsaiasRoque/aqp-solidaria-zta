import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { amountCentsSchema } from "../../../backend/src/shared/schemas.js";
import { createDonation, simulateDonation, type DonationSummary } from "../services/api.js";

interface FormFields {
  amountPen: string;
}

/**
 * HU-05 — Registrar intención de donación (MVP). CA-05.1: monto válido en PEN (S/ 1.00–S/
 * 1,000.00). CA-05.4: se genera un `Idempotency-Key` (UUID) nuevo por envío (en `services/api.ts`,
 * `createDonation`). CA-05.5: el formulario nunca solicita datos de tarjeta, CVV, cuenta bancaria
 * ni DNI — solo el monto. El esquema de validación (`amountCentsSchema`) se reutiliza directamente
 * de `backend/src/shared/schemas.ts` (design.md §2).
 */
export function DonationForm({
  accessToken,
  projectId,
}: {
  accessToken: string;
  projectId: string;
}) {
  const [created, setCreated] = useState<DonationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>();

  const onSubmit = async (values: FormFields) => {
    setError(null);
    const normalized = values.amountPen.trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
      setError("Ingresa un monto con máximo dos decimales.");
      return;
    }
    const [whole, fraction = ""] = normalized.split(".");
    const amountCents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    const parsed = amountCentsSchema.safeParse(amountCents);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Monto inválido.");
      return;
    }
    try {
      const payload = `${projectId}:${parsed.data}`;
      if (pending.current?.payload !== payload)
        pending.current = { payload, key: crypto.randomUUID() };
      const donation = await createDonation(
        accessToken,
        { projectId, amountCents: parsed.data },
        pending.current.key,
      );
      setCreated(donation);
      pending.current = null;
    } catch {
      setError("No se pudo registrar la donación.");
    }
  };

  const onSimulate = async (outcome: "CONFIRMADA_SIMULADA" | "RECHAZADA_SIMULADA") => {
    if (!created) return;
    setError(null);
    try {
      const updated = await simulateDonation(accessToken, created.donationId, outcome);
      setCreated(updated);
    } catch {
      setError("No se pudo simular la confirmación.");
    }
  };

  return (
    <div>
      <form className="form-panel" onSubmit={handleSubmit(onSubmit)}>
        <h2>Elige el monto de tu aporte</h2>
        <label className="form-field">
          Monto (S/)
          <input
            type="text"
            inputMode="decimal"
            placeholder="Por ejemplo: 25.00"
            {...register("amountPen", { required: "El monto es obligatorio." })}
          />
        </label>
        {errors.amountPen && <span role="alert">{errors.amountPen.message}</span>}
        <p className="form-help">
          Entre S/ 1.00 y S/ 1,000.00. No se solicitan datos bancarios ni se realiza un cobro.
        </p>
        <button className="button button-coral" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando…" : "Donar"} <span aria-hidden="true">↗</span>
        </button>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {created && (
        <div className="result-card">
          <p>Donación registrada: {created.status}</p>
          <p>«Simulación académica: no se ha realizado ningún cobro».</p>
          {created.status === "PENDIENTE_SIMULACION" && (
            <div className="result-actions">
              <button
                className="button button-dark"
                type="button"
                onClick={() => onSimulate("CONFIRMADA_SIMULADA")}
              >
                Simular confirmación
              </button>
              <button
                className="button button-outline"
                type="button"
                onClick={() => onSimulate("RECHAZADA_SIMULADA")}
              >
                Simular rechazo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
