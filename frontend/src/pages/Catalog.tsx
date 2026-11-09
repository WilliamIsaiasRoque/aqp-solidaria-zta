import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "../services/api.js";

function formatPen(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * HU-01 — Listar proyectos (MVP). CA-01.1: nombre, finalidad, meta en PEN y suma confirmada
 * simulada de cada proyecto PUBLICADO. CA-01.3: estado vacío comprensible sin errores técnicos.
 */
export function Catalog() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  if (isLoading) {
    return <p>Cargando proyectos…</p>;
  }

  if (isError) {
    return <p role="alert">No se pudieron cargar los proyectos. Intenta de nuevo más tarde.</p>;
  }

  const projects = data ?? [];

  if (projects.length === 0) {
    return (
      <p data-testid="empty-state">
        Todavía no hay proyectos publicados. Vuelve a consultar más tarde.
      </p>
    );
  }

  return (
    <ul aria-label="Catálogo de proyectos">
      {projects.map((project) => (
        <li key={project.projectId}>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <p>Meta: S/ {formatPen(project.goalAmountCents)}</p>
          <p>Confirmado (simulado): S/ {formatPen(project.confirmedAmountCents)}</p>
        </li>
      ))}
    </ul>
  );
}
