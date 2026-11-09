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
    return <p>Cargando proyecto…</p>;
  }

  if (isError) {
    return <p role="alert">No se pudo cargar el proyecto. Intenta de nuevo más tarde.</p>;
  }

  if (!data) {
    return <p role="alert">Proyecto no encontrado.</p>;
  }

  return (
    <article>
      <h2>{data.title}</h2>
      <p>Identificador: {data.projectId}</p>
      <p>{data.description}</p>
      <p>Estado: {data.status}</p>
      <p>Meta: S/ {(data.goalAmountCents / 100).toFixed(2)}</p>
      <p>Acumulado (simulado): S/ {(data.confirmedAmountCents / 100).toFixed(2)}</p>
    </article>
  );
}
