/**
 * Cliente HTTP del frontend contra la API ya desplegada (README.md "Recursos desplegados",
 * stage `academic`, región `us-east-2`) — se reutiliza el identificador existente, no se inventa
 * uno nuevo.
 */
export const API_BASE_URL = "https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com/academic";

export interface ProjectSummary {
  projectId: string;
  title: string;
  description: string;
  goalAmountCents: number;
  confirmedAmountCents: number;
  currency: string;
  status: "BORRADOR" | "PUBLICADO";
}

export interface CreateProjectInput {
  title: string;
  description: string;
  goalAmountCents: number;
}

/** GET /v1/projects (CA-01.1, CA-01.2, CA-01.3) — público. */
export async function fetchProjects(): Promise<ProjectSummary[]> {
  const response = await fetch(`${API_BASE_URL}/v1/projects`);
  if (!response.ok) {
    throw new Error(`No se pudieron cargar los proyectos (HTTP ${response.status}).`);
  }
  const data = (await response.json()) as { items: ProjectSummary[] };
  return data.items;
}

/**
 * GET /v1/projects/{projectId} (CA-02.1, CA-02.2) — público, solo PUBLICADO; 404 → `null` (no
 * `undefined`: TanStack Query v5 no admite `undefined` como dato de consulta válido).
 */
export async function fetchProject(projectId: string): Promise<ProjectSummary | null> {
  const response = await fetch(`${API_BASE_URL}/v1/projects/${projectId}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`No se pudo cargar el proyecto (HTTP ${response.status}).`);
  }
  return (await response.json()) as ProjectSummary;
}

/** POST /v1/projects (CA-08.1) — solo GESTOR; el backend vuelve a validar el grupo (CA-04.1). */
export async function createProject(
  accessToken: string,
  input: CreateProjectInput,
): Promise<ProjectSummary> {
  const response = await fetch(`${API_BASE_URL}/v1/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`No se pudo crear el proyecto (HTTP ${response.status}).`);
  }
  return (await response.json()) as ProjectSummary;
}

/** PATCH /v1/projects/{projectId}/publish (CA-08.2) — solo GESTOR. */
export async function publishProject(
  accessToken: string,
  projectId: string,
): Promise<ProjectSummary> {
  const response = await fetch(`${API_BASE_URL}/v1/projects/${projectId}/publish`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo publicar el proyecto (HTTP ${response.status}).`);
  }
  return (await response.json()) as ProjectSummary;
}
