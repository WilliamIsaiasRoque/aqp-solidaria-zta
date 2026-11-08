# API Contract: Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

**Fuente única**: [design.md](../../../design.md) §4 ("Endpoints mínimos"), transcrito exacto, sin rutas,
métodos ni respuestas adicionales a las ahí definidas. El contrato formal en OpenAPI 3.1 vive en
`docs/api.yaml` (design.md §4, §8) y debe generarse a partir de esta misma tabla, no de una reinterpretación.

## Convenciones generales — **[MVP]**

- Cabecera `Authorization: Bearer <access_token>`; las rutas protegidas declaran `AuthorizationScopes` en
  SAM, de modo que un ID token es rechazado (design.md §4).
- `POST /v1/donations` exige `Idempotency-Key` (UUID) y body `{ projectId, amountCents }`; `donorSub` se
  toma del contexto del authorizer, nunca del body (design.md §4, CA-05.3).
- Errores con formato uniforme `{ code, message, requestId }`, sin detalles internos (design.md §4).

## Endpoints

### GET `/v1/projects` — **[MVP]**
- **Acceso**: público.
- **Respuestas**: `200`.
- **Trazabilidad**: HU-01, CA-01.1, CA-01.2, CA-01.3, T01.

### GET `/v1/projects/{projectId}` — **[MVP]**
- **Acceso**: público (solo proyectos `PUBLICADO`).
- **Respuestas**: `200` / `404`.
- **Trazabilidad**: HU-02, CA-02.1, CA-02.2.

### GET `/v1/projects/{projectId}/stats` — **[MVP]**
- **Acceso**: público.
- **Respuestas**: `200` / `404`.
- **Trazabilidad**: HU-09, CA-09.1, CA-09.2.

### POST `/v1/projects` — **[MVP]**
- **Acceso**: scope `api/projects.write` + grupo `GESTOR`.
- **Respuestas**: `201` / `400` / `401` / `403`.
- **Trazabilidad**: HU-08, CA-08.1, CA-08.3, CA-04.1, T03.

### PATCH `/v1/projects/{projectId}/publish` — **[MVP]**
- **Acceso**: scope `api/projects.write` + grupo `GESTOR`.
- **Respuestas**: `200` / `401` / `403` / `404` / `409`.
- **Trazabilidad**: HU-08, CA-08.2, CA-08.3.

### POST `/v1/donations` — **[MVP]**
- **Acceso**: scope `api/donations.write` + grupo `DONANTE`.
- **Respuestas**: `201` / `400` / `401` / `403` / `404` / `409`.
- **Trazabilidad**: HU-05, CA-05.1 a CA-05.5, T02, T04, T05, T06, T07, T11.

### POST `/v1/donations/{donationId}/simulate` — **[MVP]**
- **Acceso**: scope `api/donations.write` + grupo `DONANTE` propietario; **solo se despliega en el stage
  `academic`** (condición en la plantilla SAM; en otro stage la ruta no existe).
- **Respuestas**: `200` / `401` / `403` / `404` / `409`.
- **Trazabilidad**: HU-06, CA-06.1 a CA-06.4, RNF-HU-04, CA-NF04.1, CA-NF04.2, T08.

### GET `/v1/donations/me` — **[MVP]**
- **Acceso**: scope `api/donations.read` + grupo `DONANTE`.
- **Respuestas**: `200` / `401`.
- **Trazabilidad**: HU-07, CA-07.1, CA-07.2, CA-04.2, T09, T12.

### GET `/v1/audit` — **[Extensión — HU-10]**
- **Acceso**: scope `api/audit.read` + grupo `AUDITOR` (con MFA).
- **Respuestas**: `200` / `401` / `403`.
- **Trazabilidad**: HU-10, CA-10.1, CA-10.2.
- **Nota**: este endpoint no forma parte del MVP; su ausencia no bloquea las historias HU-01 a HU-09 ni
  HU-11, ni los requisitos no funcionales RNF-HU-01 a RNF-HU-11.

## Nota sobre la extensión HU-12 — **[Extensión — HU-12]**

HU-12 no introduce nuevos endpoints; sustituye el motor de decisión interno del módulo `authz` (invocado
por los endpoints marcados **[MVP]** arriba que ya exigen grupo/propiedad) por una llamada a Amazon
Verified Permissions (`IsAuthorized`) evaluando políticas Cedar, conforme a design.md §1 AD-08 y §4. El
contrato HTTP de los endpoints no cambia; cambia únicamente la implementación interna de la decisión de
autorización en `src/authz/`.
