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
    return (
      <p className="loading-state" role="status">
        Cargando proyectos…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="notice-card" role="alert">
        No se pudieron cargar los proyectos. Intenta de nuevo más tarde.
      </p>
    );
  }

  const projects = data ?? [];

  if (projects.length === 0) {
    return (
      <div className="empty-panel" data-testid="empty-state">
        <div className="empty-icon" aria-hidden="true">
          ✳
        </div>
        <h3>Las buenas ideas están tomando forma</h3>
        <p>
          Todavía no hay proyectos publicados. Vuelve a consultar más tarde. Los gestores podrán
          publicarlos desde su espacio de trabajo.
        </p>
      </div>
    );
  }

  return (
    <ul className="project-grid" aria-label="Catálogo de proyectos">
      {projects.map((project) => (
        <li className="project-card" key={project.projectId}>
          <div className="project-visual">
            <span>INICIATIVA COMUNITARIA</span>
          </div>
          <div className="project-content">
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="project-meta">
              <span>
                Meta<strong>S/ {formatPen(project.goalAmountCents)}</strong>
              </span>
              <span>
                Confirmado (simulado)<strong>S/ {formatPen(project.confirmedAmountCents)}</strong>
              </span>
            </div>
            <progress
              className="project-progress"
              value={Math.min(100, (project.confirmedAmountCents / project.goalAmountCents) * 100)}
              max="100"
              aria-label="Progreso simulado de la meta"
            />
            <a
              className="project-card-link"
              href={`/proyectos/${encodeURIComponent(project.projectId)}`}
            >
              Conocer proyecto ↗
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
