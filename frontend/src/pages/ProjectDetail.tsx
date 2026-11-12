import { useQuery } from "@tanstack/react-query";
import { fetchProject } from "../services/api.js";

/**
 * HU-02 — Consultar detalle (MVP). CA-02.1: identificador, descripción, objetivo, estado y monto
 * acumulado, sin datos personales de donantes. CA-02.2: un `projectId` inexistente o no publicado
 * se muestra como "no encontrado", igual que el 404 del backend (sin distinguir la causa).
 */
export function ProjectDetail({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
  });

  if (isLoading) {
    return (
      <p className="loading-state" role="status">
        Cargando proyecto…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="notice-card" role="alert">
        No se pudo cargar el proyecto. Intenta de nuevo más tarde.
      </p>
    );
  }

  if (!data) {
    return (
      <p className="notice-card" role="alert">
        Proyecto no encontrado.
      </p>
    );
  }

  return (
    <article className="detail-card">
      <div className="detail-art" aria-hidden="true" />
      <div className="detail-content">
        <span className="section-kicker">PROYECTO PUBLICADO · {data.projectId}</span>
        <h2>{data.title}</h2>
        <p>{data.description}</p>
        <div className="detail-figures">
          <span>
            Meta<strong>S/ {(data.goalAmountCents / 100).toFixed(2)}</strong>
          </span>
          <span>
            Acumulado (simulado)<strong>S/ {(data.confirmedAmountCents / 100).toFixed(2)}</strong>
          </span>
        </div>
        <a
          className="button button-coral"
          href={`/proyectos/${encodeURIComponent(data.projectId)}/donar`}
        >
          Simular una donación <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
