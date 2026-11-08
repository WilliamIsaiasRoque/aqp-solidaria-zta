# Quickstart de validación: Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

**Fuente única**: [design.md](../../design.md) §4 (flujo de una donación académica), §7 (cuenta AWS Free
plan) y §9 (plan de trabajo e hitos de día 3), más [requirements.md](../../requirements.md) §6 (T01–T14).
Esta guía valida el feature de extremo a extremo una vez desplegado el stage `academic`; no contiene
código de implementación — eso corresponde a `tasks.md` y a la fase de implementación.

## Prerrequisitos — **[MVP]**

1. Cuenta AWS Free plan configurada según design.md §7 (día 1 del plan de trabajo): MFA en root, un
   usuario IAM por integrante con MFA, una sola región, alerta en AWS Budgets.
2. Infraestructura desplegada vía AWS SAM en el stage `academic` (Cognito User Pool con grupos
   `DONANTE`/`GESTOR`/`AUDITOR` y MFA TOTP para GESTOR/AUDITOR; API Gateway HTTP API; tablas DynamoDB
   `Projects`, `Donations`, `Idempotency`, `AuditEvents`; CloudFront + S3 para el frontend).
3. Al menos un usuario de prueba por rol (Visitante no requiere cuenta; Donante, Gestor y Auditor sí).
4. Colección Bruno/Postman versionada contra el stage desplegado (design.md §9).

## Escenario 1 — Catálogo público (HU-01, HU-02, HU-09) — **[MVP]**

1. Sin autenticarse, ejecutar `GET /v1/projects`.
   - **Esperado**: `200`; ningún proyecto en `BORRADOR` aparece (T01, CA-01.1, CA-01.2).
2. Ejecutar `GET /v1/projects/{projectId}` con un `projectId` inexistente o en `BORRADOR`.
   - **Esperado**: `404` sin revelar contenido (CA-02.2).
3. Ejecutar `GET /v1/projects/{projectId}/stats` sobre un proyecto con donaciones en distintos estados.
   - **Esperado**: la suma mostrada excluye `PENDIENTE_SIMULACION` y `RECHAZADA_SIMULADA`; no se exponen
     identificadores de donantes (CA-09.1, CA-09.2).

## Escenario 2 — Identidad y acceso (HU-03, HU-04, HU-11) — **[MVP]**

1. Iniciar sesión con un usuario `GESTOR` sin completar el segundo factor.
   - **Esperado**: no se obtienen tokens (T14, CA-11.2).
2. Con un usuario `DONANTE` autenticado, intentar `POST /v1/projects`.
   - **Esperado**: `403` (T03, CA-04.1).
3. Sin token, intentar `POST /v1/donations`.
   - **Esperado**: `401` (T02, CA-03.2).
4. Usar un ID token (en vez de access token) o un token alterado como Bearer en cualquier ruta protegida.
   - **Esperado**: `401` (T11, CA-03.2, CA-NF02.1).

## Escenario 3 — Gestión de proyectos (HU-08) — **[MVP]**

1. Con un usuario `GESTOR`, crear un proyecto (`POST /v1/projects`) con título, descripción y objetivo
   PEN positivo.
   - **Esperado**: `201`, estado `BORRADOR` (CA-08.1); se registra un `AuditEvent` (CA-08.3).
2. Publicar ese proyecto (`PATCH /v1/projects/{projectId}/publish`).
   - **Esperado**: `200`; el proyecto ya acepta donaciones (CA-08.2).
3. Repetir la publicación sobre el mismo proyecto.
   - **Esperado**: `409` (CA-08.2).

## Escenario 4 — Donación e idempotencia (HU-05, HU-07) — **[MVP]**

1. Con un usuario `DONANTE`, enviar `POST /v1/donations` con `amountCents = 0`, `100001`, o un valor no
   entero.
   - **Esperado**: `400` (T04, CA-05.2).
2. Enviar `POST /v1/donations` con un `amountCents` válido (entre 100 y 100000), `projectId` publicado y
   una `Idempotency-Key` (UUID) nueva.
   - **Esperado**: `201`, estado `PENDIENTE_SIMULACION`, sin cargo (T05, CA-05.1).
3. Reenviar la misma solicitud con la misma `Idempotency-Key` y el mismo body.
   - **Esperado**: mismo resultado, una sola donación creada (T06, CA-05.4).
4. Reenviar la misma `Idempotency-Key` con un body distinto.
   - **Esperado**: `409` (T07, CA-05.4).
5. Con un segundo usuario `DONANTE`, intentar `GET` sobre la donación del primero.
   - **Esperado**: `403` o `404` sin filtrar datos (T09, CA-07.2).
6. Con un usuario `GESTOR`, intentar `GET /v1/donations/me` de un donante.
   - **Esperado**: `403` o `404` (T12, CA-04.2).

## Escenario 5 — Simulación y concurrencia (HU-06) — **[MVP]**

1. Sobre la donación `PENDIENTE_SIMULACION` del escenario 4, invocar
   `POST /v1/donations/{donationId}/simulate` en el stage `academic`.
   - **Esperado**: transición a `CONFIRMADA_SIMULADA` o `RECHAZADA_SIMULADA`; la UI muestra «Simulación
     académica: no se ha realizado ningún cobro» (CA-06.1, CA-06.4).
2. Verificar en un stage distinto de `academic` que la ruta de simulación no existe.
   - **Esperado**: la ruta no está desplegada (CA-06.1).
3. Disparar 10 solicitudes concurrentes de simulación sobre la misma donación.
   - **Esperado**: un solo incremento del monto confirmado del proyecto (T08, CA-06.2, CA-NF04.1).

## Escenario 6 — Vigencia y revocación de tokens (HU-03) — **[MVP]**

1. Revocar el refresh token de una sesión (cierre de sesión) y reutilizar el access token ya emitido
   antes de su expiración natural.
   - **Esperado**: el access token sigue siendo aceptado hasta expirar (limitación documentada, T13,
     CA-03.4); tras la expiración, se rechaza.

## Escenario 7 (Extensión) — Auditoría (HU-10) — **[Extensión — HU-10]**

1. Con un usuario `AUDITOR` con MFA, ejecutar `GET /v1/audit` con filtros por tipo y fecha.
   - **Esperado**: `200`, eventos con `timestamp`, `requestId`, actor seudonimizado, recurso, acción y
     resultado; nunca tokens, claves ni datos financieros (CA-10.1, CA-10.2).
2. Con un usuario `DONANTE` o `GESTOR`, intentar el mismo `GET /v1/audit`.
   - **Esperado**: `403`.

## Escenario 8 (Extensión) — Autorización externalizada (HU-12) — **[Extensión — HU-12]**

1. Con el motor de Amazon Verified Permissions/Cedar habilitado, re-ejecutar T03, T09 y T12.
   - **Esperado**: los mismos resultados que con la autorización embebida (CA-12.1, CA-12.2); documentar
     la comparación en el informe técnico.

## Revisión de mínimo privilegio (RNF-HU-03) — **[MVP]**

1. Intentar que la función Lambda de listado de proyectos escriba en DynamoDB (prueba controlada o
   simulador de políticas IAM).
   - **Esperado**: acceso denegado y error controlado (T10, CA-NF03.1).

## Checklist de cierre de la validación — **[MVP]**

- [ ] T01–T14 ejecutados con evidencia (requirements.md §6).
- [ ] Ningún control de seguridad fue simplificado o eliminado respecto a este plan y a design.md.
- [ ] El endpoint de simulación no existe fuera del stage `academic`.
- [ ] Recursos AWS eliminados tras concluir la validación (`sam delete` y verificación en Tag
  Editor/Resource Explorer, design.md §7).
