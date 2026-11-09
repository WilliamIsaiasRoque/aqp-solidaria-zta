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
