import { useState } from "react";
import { useForm } from "react-hook-form";
import { createProjectSchema } from "../../../backend/src/shared/schemas.js";
import { createProject, publishProject, type ProjectSummary } from "../services/api.js";

interface FormFields {
  title: string;
  description: string;
  goalAmountCents: string;
}

/**
 * HU-08 — Gestionar proyectos (MVP). CA-08.1/CA-08.2: crear y publicar. El chequeo de `groups` aquí
 * es una guardia de UX, NUNCA de seguridad (Constitución §II): el backend (`requireGroup` en
 * createProject.ts/publishProject.ts) vuelve a exigir el grupo GESTOR en cada solicitud (CA-04.1).
 * El esquema de validación (`createProjectSchema`) se reutiliza directamente de
 * `backend/src/shared/schemas.ts`, conforme a design.md §2 ("los esquemas Zod se reutilizan en
 * backend").
 */
export function ManageProjects({
  accessToken,
  groups,
}: {
  accessToken: string;
  groups: string[];
}) {
  const [created, setCreated] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormFields>();

  if (!groups.includes("GESTOR")) {
    return <p role="alert">Esta sección es solo para gestores.</p>;
  }

  const onSubmit = async (values: FormFields) => {
    setError(null);
    const parsed = createProjectSchema.safeParse({
      title: values.title,
      description: values.description,
      goalAmountCents: Number(values.goalAmountCents),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    try {
      const project = await createProject(accessToken, parsed.data);
      setCreated(project);
    } catch {
      setError("No se pudo crear el proyecto.");
    }
  };

  const onPublish = async () => {
    if (!created) return;
    setError(null);
    try {
      const published = await publishProject(accessToken, created.projectId);
      setCreated(published);
    } catch {
      setError("No se pudo publicar el proyecto.");
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>
          Título
          <input {...register("title", { required: "El título es obligatorio." })} />
        </label>
        {errors.title && <span role="alert">{errors.title.message}</span>}

        <label>
          Descripción
          <textarea {...register("description", { required: "La descripción es obligatoria." })} />
        </label>
        {errors.description && <span role="alert">{errors.description.message}</span>}

        <label>
          Objetivo (céntimos PEN)
          <input
            type="number"
            {...register("goalAmountCents", { required: "El objetivo es obligatorio." })}
          />
        </label>
        {errors.goalAmountCents && <span role="alert">{errors.goalAmountCents.message}</span>}

        <button type="submit">Crear proyecto</button>
      </form>

      {error && <p role="alert">{error}</p>}

      {created && (
        <div>
          <p>
            Proyecto creado: {created.title} ({created.status})
          </p>
          {created.status === "BORRADOR" && <button onClick={onPublish}>Publicar</button>}
        </div>
      )}
    </div>
  );
}
