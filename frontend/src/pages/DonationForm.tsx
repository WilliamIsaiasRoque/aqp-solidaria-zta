import { useState } from "react";
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
export function DonationForm({ accessToken, projectId }: { accessToken: string; projectId: string }) {
  const [created, setCreated] = useState<DonationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormFields>();

  const onSubmit = async (values: FormFields) => {
    setError(null);
    const amountCents = Math.round(Number(values.amountPen) * 100);
    const parsed = amountCentsSchema.safeParse(amountCents);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Monto inválido.");
      return;
    }
    try {
      const donation = await createDonation(accessToken, { projectId, amountCents: parsed.data });
      setCreated(donation);
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>
          Monto (S/)
          <input
            type="number"
            step="0.01"
            {...register("amountPen", { required: "El monto es obligatorio." })}
          />
        </label>
        {errors.amountPen && <span role="alert">{errors.amountPen.message}</span>}
        <button type="submit">Donar</button>
      </form>

      {error && <p role="alert">{error}</p>}

      {created && (
        <div>
          <p>Donación registrada: {created.status}</p>
          <p>«Simulación académica: no se ha realizado ningún cobro».</p>
          {created.status === "PENDIENTE_SIMULACION" && (
            <>
              <button type="button" onClick={() => onSimulate("CONFIRMADA_SIMULADA")}>
                Simular confirmación
              </button>
              <button type="button" onClick={() => onSimulate("RECHAZADA_SIMULADA")}>
                Simular rechazo
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
