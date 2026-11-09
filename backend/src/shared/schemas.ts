import { z } from "zod";

/**
 * `amountCents` compartido entre frontend y backend (design.md §2, data-model.md "Donations").
 * Regla verbatim de data-model.md: "Entre 100 y 100000 (S/ 1.00–S/ 1,000.00), entero (CA-05.1/CA-05.2)".
 */
export const amountCentsSchema = z
  .number()
  .int({ message: "amountCents debe ser un entero (CA-05.2)." })
  .min(100, { message: "amountCents debe ser al menos 100 (S/ 1.00, CA-05.1)." })
  .max(100000, { message: "amountCents debe ser como máximo 100000 (S/ 1,000.00, CA-05.1)." });

/**
 * Entrada de `POST /v1/projects` (CA-08.1, requirements.md HU-08): "título, descripción, objetivo
 * PEN positivo".
 */
export const createProjectSchema = z.object({
  title: z.string().trim().min(1, { message: "title es obligatorio (CA-08.1)." }),
  description: z.string().trim().min(1, { message: "description es obligatorio (CA-08.1)." }),
  goalAmountCents: z
    .number()
    .int({ message: "goalAmountCents debe ser un entero." })
    .positive({ message: "goalAmountCents debe ser positivo (CA-08.1)." }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
