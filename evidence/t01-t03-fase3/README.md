# Evidencia T01 / T03 — Fase 3 (catálogo y gestión de proyectos)

**Fecha**: 2026-11-09
**Comando**: `npx vitest run backend/test/integration/projects.test.ts --reporter=verbose`
**Archivo**: [`test_run.txt`](./test_run.txt)

## Alcance de esta evidencia

Al igual que `auth.test.ts` en la Fase 2, esta prueba ejerce la lógica de los handlers
(`listProjects`, `createProject`) con un repositorio en memoria que implementa el mismo contrato
(`ProjectsRepository`) que `dynamoDbProjectsRepository` — no contra DynamoDB real. Las funciones
Lambda nuevas de esta fase (`ListProjectsFunction`, `GetProjectFunction`, `GetProjectStatsFunction`,
`CreateProjectFunction`, `PublishProjectFunction`) se agregaron a `infra/template.yaml`, pero **aún
no se han desplegado**: el stack `academic` desplegado hasta ahora solo incluye los recursos de la
Fase 2 (`AuthCheckFunction` y la infraestructura base). La verificación de extremo a extremo contra
el stage real desplegado (equivalente a lo hecho en `evidence/t02-t11-fase2/` para T02/T11) queda
pendiente de que el equipo ejecute `sam build && sam deploy` con la plantilla actualizada.

## Resultado

| Prueba | Escenario | Resultado |
|---|---|---|
| T01 | Visitante consulta proyectos (lista con publicados y borradores mezclados) | 200, solo el publicado ✅ |
| T01 | Catálogo sin proyectos publicados (CA-01.3) | 200, `{ items: [] }`, sin error técnico ✅ |
| T03 | Donante (`cognito:groups: ["DONANTE"]`) intenta `POST /v1/projects` | 403 `FORBIDDEN` ✅ |
| — | Gestor (`cognito:groups: ["GESTOR"]`) crea proyecto (control positivo) | 201, estado `BORRADOR`, `AuditEvent` registrado ✅ |

Los logs JSON estructurados (`requestId`, `action`, `outcome`, `httpStatus`, `durationMs`) que emite
cada handler quedan capturados en `test_run.txt`, consistentes con RNF-HU-07 (CA-NF07.1).
