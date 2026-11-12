---

description: "Task list for Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA"
---

# Tasks: Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

**Input**: Design documents from `/specs/001-plataforma-donaciones-seguras/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md),
[contracts/api.md](./contracts/api.md), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Organización**: las fases siguen exactamente el orden de días 1–7 de design.md §9 (por instrucción
explícita del usuario); dentro de cada fase, las tareas se agrupan por la(s) historia(s) de usuario que
implementan. El marcador **[Story]** usa el identificador `HU-xx` original en vez de `USx` genérico, para
que la trazabilidad a HU/CA/RNF-HU sea directa (ver Notes). Cada tarea queda etiquetada **[MVP]** o
**[Extensión]** igual que en plan.md, y cita el o los identificadores `HU-xx` / `CA-xx.x` / `RNF-HU-xx` /
`CA-NFxx.x` / `T0x` que satisface.

**Tests**: se incluyen como tareas los casos de aceptación T01–T14 de requirements.md §6, porque
design.md §9 los fija explícitamente como entregable verificable de cada día; no son pruebas unitarias
genéricas añadidas por este comando.

## Format: `[ID] [P?] [HU-xx] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencia de tareas incompletas).
- **[HU-xx]**: historia de usuario a la que pertenece la tarea.
- Cada tarea incluye la ruta de archivo exacta, tomada de la estructura de plan.md.

## Path Conventions

Según `Project Structure` de [plan.md](./plan.md) (transcrita de design.md §8):
`frontend/src/...`, `backend/src/{projects,donations,authz,audit,shared}/...`, `infra/template.yaml`,
`policies/...`, `docs/...`, `.github/workflows/ci.yml`.

---

## Phase 1: Setup — Día 1 (design.md §9) — **[MVP]**

**Purpose**: análisis, threat model, cuenta Free plan, repositorio y CI (entregable: cuenta segura,
`main` protegida, CI en verde con proyecto vacío — design.md §9).

- [X] T001 Crear la estructura de repositorio `frontend/`, `backend/src/{projects,donations,authz,audit,shared}/`, `infra/`, `policies/`, `docs/`, `evidence/`, `.github/workflows/` tal como la define `Project Structure` de [plan.md](./plan.md) (design.md §8). **[MVP]** — RNF-HU-08 (CA-NF08.2)
- [X] T002 Crear la cuenta AWS Free plan del equipo: activar MFA en el usuario root y dejar de usarlo, documentar el procedimiento en `README.md`. **[MVP]** — RNF-HU-09 (CA-NF09.1) — *documentado el procedimiento; la creación real de la cuenta AWS queda como acción manual pendiente del equipo (ver README.md)*
- [X] T003 [P] Crear un usuario IAM por integrante con MFA y sin llaves de acceso de larga duración; documentar en `README.md`. **[MVP]** — RNF-HU-03 (CA-NF03.3) — *documentado el procedimiento; la creación real de los usuarios IAM queda pendiente del equipo*
- [X] T004 [P] Fijar una sola región (recomendado `us-east-1`; **actualizado a `us-east-2` por decisión de equipo durante la Fase 2**) y configurar una alerta en AWS Budgets; documentar en `README.md`. **[MVP]** — RNF-HU-09 (CA-NF09.1) — *documentado el procedimiento; la configuración real en AWS Budgets queda pendiente del equipo*
- [ ] T005 Proteger la rama `main` en GitHub (sin integraciones directas) y configurar la plantilla de PR exigiendo revisión de un integrante distinto del autor. **[MVP]** — Constitución §"Flujo de trabajo y control de cambios"; design.md §8 — *plantilla de PR creada (`.github/PULL_REQUEST_TEMPLATE.md`); la protección de rama en GitHub (ajuste de configuración del repositorio) no se aplicó: requiere permiso explícito del usuario, ver resumen*
- [X] T006 [P] Configurar CI en `.github/workflows/ci.yml` ejecutando lint, typecheck, tests y build en cada PR. **[MVP]** — RNF-HU-08 (CA-NF08.1)
- [X] T007 [P] Inicializar el proyecto TypeScript compartido (versión fijada en `package-lock.json`) con ESLint y Prettier configurados en la raíz del repositorio. **[MVP]** — design.md §2
- [X] T008 [P] Redactar el borrador de `docs/threat-model.md` (STRIDE resumido) y la tabla de mapeo a los 7 principios de NIST SP 800-207 y a PE/PA/PEP de design.md §6.1 (se completa en días posteriores). **[MVP]** — RNF-HU-02 (CA-NF02.3)
- [X] T009 [P] Crear el esqueleto de `AI_USAGE.md` con las columnas Herramienta/Participantes/Tareas asistidas/Aportes IA/Validación humana/Limitaciones de design.md §10. **[MVP]** — design.md §10, §5

**Checkpoint**: cuenta segura, `main` protegida, CI en verde con el repositorio vacío (design.md §9, día 1).

---

## Phase 2: Foundational — Día 2 (design.md §9) — **[MVP]** — ⚠️ BLOQUEA todas las historias

**Purpose**: infraestructura base y autenticación (entregable: SAM con Cognito, API y DynamoDB
desplegados; login PKCE funcionando; T02 y T11 — design.md §9).

- [X] T010 Definir `infra/template.yaml` (AWS SAM) con el stage `academic` como parámetro/condición raíz. **[MVP]** — design.md §1 AD-06; RNF-HU-09 (CA-NF09.1) — *parámetro `StageName` (default/único valor permitido `academic`); región fijada a `us-east-2` por decisión de equipo (ver README.md)*
- [X] T011 [P] En `infra/template.yaml`, declarar el Amazon Cognito User Pool con los grupos `DONANTE`, `GESTOR`, `AUDITOR`. **[MVP]** — HU-03 (CA-03.1), HU-04 (CA-04.3)
- [X] T012 [P] En `infra/template.yaml`, exigir MFA TOTP (no SMS) para los grupos `GESTOR` y `AUDITOR`. **[MVP]** — HU-11 (CA-11.1) — *habilitado `SOFTWARE_TOKEN_MFA` a nivel de User Pool (CloudFormation no permite exigir MFA solo a grupos específicos); la exigencia por grupo queda documentada como limitación en docs/threat-model.md y se verifica operativamente en la Fase 5 (T057)*
- [X] T013 En `infra/template.yaml`, declarar el API Gateway HTTP API con JWT authorizer que valida issuer (user pool), firma, expiración y `client_id`. **[MVP]** — RNF-HU-02 (CA-NF02.1) — validado con `sam validate --lint`
- [X] T014 [P] En `infra/template.yaml`, declarar las tablas DynamoDB `Projects` (GSI `status-createdAt`), `Donations` (GSI `donorSub-createdAt`), `Idempotency` (TTL `expiresAt`) y `AuditEvents` (PK `eventType`, SK `timestamp#eventId`) según [data-model.md](./data-model.md). **[MVP]** — design.md §5
- [X] T015 En `infra/template.yaml`, crear un rol IAM por función Lambda con solo las acciones y tablas DynamoDB que cada función necesita (p. ej. la función de listado sin permiso de escritura). **[MVP]** — RNF-HU-03 (CA-NF03.1, CA-NF03.2) — *`AuthCheckFunction` sin política DynamoDB (no la necesita); el patrón de un rol por función se replica en las Fases 3+ a medida que se agregan funciones*
- [X] T016 Implementar en `backend/src/authz/context.ts` la derivación de `sub` y `cognito:groups` exclusivamente desde el contexto verificado del authorizer (nunca desde el body del cliente). **[MVP]** — HU-04 (CA-04.3); RNF-HU-02 (CA-NF02.2)
- [X] T017 [P] Implementar en `backend/src/shared/logger.ts` el logging estructurado (JSON con `requestId`, acción, resultado, código HTTP, duración) con retención ≤ 14 días configurada en `infra/template.yaml`. **[MVP]** — RNF-HU-07 (CA-NF07.1)
- [X] T018 [P] Implementar en `backend/src/shared/errors.ts` el formato uniforme de error `{ code, message, requestId }` sin detalles internos. **[MVP]** — contracts/api.md "Convenciones generales"
- [X] T019 [P] Implementar en `backend/src/shared/schemas.ts` el esquema Zod de `amountCents` (entero, mínimo 100, máximo 100000) reutilizable por frontend y backend. **[MVP]** — HU-05 (CA-05.2)
- [X] T020 Implementar en `frontend/src/auth/oidc.ts` el flujo Authorization Code + PKCE con `oidc-client-ts`, manteniendo los tokens solo en memoria. **[MVP]** — HU-03 (CA-03.1); RNF-HU-11 (CA-NF11.1)
- [X] T021 Implementar en `frontend/src/auth/session.ts` el cierre de sesión: elimina los tokens de memoria y revoca el refresh token (`/oauth2/revoke` o `RevokeToken`). **[MVP]** — HU-03 (CA-03.3)
- [X] T022 [P] En `infra/template.yaml`, configurar CloudFront + OAC sobre S3 privado con una response headers policy (CSP restrictiva, HSTS, `X-Content-Type-Options`, `Referrer-Policy`). **[MVP]** — RNF-HU-11 (CA-NF11.2); RNF-HU-01 (CA-NF01.1)
- [X] T023 [US-T02][US-T11] Escribir y ejecutar la prueba de aceptación **T02** (sin token intenta donar → 401) y **T11** (ID token o token alterado como Bearer → 401) contra el stage desplegado, en `backend/test/integration/auth.test.ts`, con evidencia guardada en `evidence/`. **[MVP]** — CA-03.2, CA-NF02.1 — *4 tests pasando localmente (roja→verde) como defensa adicional (Principio II), más verificación real contra el stage `academic` desplegado (`https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com/academic/v1/_internal/authcheck`): T02 (sin token) y T11 (token con firma alterada / token malformado) devuelven 401 del JWT authorizer — evidencia en `evidence/t02-t11-fase2/`. Pendiente solo la variante T11 con un ID token real (requiere login de un usuario de prueba, Fase 3+)*

**Checkpoint**: SAM con Cognito, API y DynamoDB desplegados; login PKCE funcionando; T02 y T11 con
evidencia (design.md §9, día 2).

---

## Phase 3: HU-01, HU-02, HU-08, HU-09 — Catálogo y gestión de proyectos — Día 3 (design.md §9) — **[MVP]**

**Goal**: visitantes exploran y consultan proyectos publicados con sus indicadores agregados; un gestor
los crea y publica (entregable: HU-01, HU-02, HU-08, HU-09; T01, T03 — design.md §9).

**Independent Test**: con la infraestructura de la Fase 2 desplegada, un GESTOR crea y publica un
proyecto, y un visitante sin autenticarse lo ve en el catálogo y en el detalle con su indicador agregado.

### Tests para esta fase

- [X] T024 [P] [HU-01] Escribir y ejecutar **T01** (visitante consulta proyectos → 200, sin borradores) en `backend/test/integration/projects.test.ts`, con evidencia en `evidence/`. **[MVP]** — CA-01.1, CA-01.2 — *prueba local (datos mixtos) + verificación real contra el stage `academic` desplegado (`GET /academic/v1/projects` → 200); evidencia en `evidence/t01-t03-fase3/`. El "sin borradores" con datos reales queda pendiente de que exista al menos un proyecto `BORRADOR` creado en la cuenta (tabla vacía en esta corrida). Nota de proceso: el test se escribió después de los handlers T026-T032, a diferencia de las Fases 1-2*
- [X] T025 [P] [HU-08] Escribir y ejecutar **T03** (donante intenta crear proyecto → 403) en `backend/test/integration/projects.test.ts`, con evidencia en `evidence/`. **[MVP]** — CA-04.1 — *confirmado por prueba local (403 FORBIDDEN). Verificación real contra el stage desplegado PARCIALMENTE VERIFICADA por decisión de equipo: `POST /v1/projects` exige un access token válido (401 sin token, confirmado en real); el 403 para un DONANTE autenticado queda pendiente a propósito hasta la Fase 4/5, cuando exista login real de prueba end-to-end con el frontend desplegado — ver `evidence/t01-t03-fase3/README.md` §1*

### Implementación

- [X] T026 [P] [HU-01] Implementar el modelo de acceso a `Project` (lectura) en `backend/src/projects/repository.ts`, respetando el campo `confirmedAmountCents` como entero y `status` (`BORRADOR`/`PUBLICADO`) de [data-model.md](./data-model.md). **[MVP]** — HU-01, HU-02
- [X] T027 [HU-01] Implementar `GET /v1/projects` (público, excluye `BORRADOR`, estado vacío sin errores técnicos si no hay proyectos) en `backend/src/projects/listProjects.ts`. **[MVP]** — CA-01.1, CA-01.2, CA-01.3
- [X] T028 [HU-02] Implementar `GET /v1/projects/{projectId}` (público, solo `PUBLICADO`, 404 sin revelar contenido si no existe o no está publicado) en `backend/src/projects/getProject.ts`. **[MVP]** — CA-02.1, CA-02.2
- [X] T029 [HU-09] Implementar `GET /v1/projects/{projectId}/stats` (suma excluye `PENDIENTE_SIMULACION` y `RECHAZADA_SIMULADA`, sin identificadores de donantes) en `backend/src/projects/getProjectStats.ts`. **[MVP]** — CA-09.1, CA-09.2
- [X] T030 [P] [HU-08] Implementar `POST /v1/projects` (solo grupo `GESTOR`, título + descripción + objetivo PEN positivo, estado inicial `BORRADOR`, 403 para otros roles) en `backend/src/projects/createProject.ts`, usando `backend/src/authz/context.ts` (T016). **[MVP]** — CA-08.1, CA-04.1
- [X] T031 [HU-08] Implementar `PATCH /v1/projects/{projectId}/publish` (solo `GESTOR`, 409 si ya está `PUBLICADO`) en `backend/src/projects/publishProject.ts`. **[MVP]** — CA-08.2
- [X] T032 [HU-08] Registrar un `AuditEvent` (actor, fecha, acción, resultado) en cada creación y publicación de proyecto, en `backend/src/audit/recordEvent.ts`, consumido por T030 y T031. **[MVP]** — CA-08.3
- [X] T033 [P] [HU-01] Implementar la página de catálogo público en `frontend/src/pages/Catalog.tsx` (nombre, finalidad, meta PEN, suma confirmada; estado vacío comprensible). **[MVP]** — CA-01.1, CA-01.3
- [X] T034 [P] [HU-02] Implementar la página de detalle de proyecto en `frontend/src/pages/ProjectDetail.tsx` (identificador, descripción, objetivo, estado, monto acumulado, sin datos de donantes). **[MVP]** — CA-02.1
- [X] T035 [P] [HU-08] Implementar la página de gestión de proyectos (crear/publicar) en `frontend/src/pages/ManageProjects.tsx`, visible solo a `GESTOR` (guardia de UX, no de seguridad). **[MVP]** — CA-08.1, CA-08.2; Constitución §II (el guard de UI no sustituye a T030/T031) — *tests en `frontend/test/pages/pages.test.tsx` (rojo→verde)*

**Checkpoint**: HU-01, HU-02, HU-08, HU-09 funcionales de forma independiente; T01 y T03 con evidencia
(design.md §9, día 3).

---

## Phase 4: HU-05, HU-07 — Donaciones e idempotencia — Día 4 (design.md §9) — **[MVP]**

**Goal**: un donante autenticado registra una intención de donación idempotente y consulta su propio
historial (entregable: HU-05, HU-07; T04–T07, T09, T12 — design.md §9).

**Independent Test**: con un proyecto `PUBLICADO` de la Fase 3, un DONANTE autenticado registra una
donación, la reenvía con la misma clave de idempotencia (mismo resultado) y con clave reutilizada y
payload distinto (409); consulta su historial y no puede ver el de otro donante.

### Tests para esta fase

- [X] T036 [P] [HU-05] Escribir y ejecutar **T04** (monto 0, 100001 o no entero → 400) en `backend/test/integration/donations.test.ts`. **[MVP]** — CA-05.2
- [X] T037 [P] [HU-05] Escribir y ejecutar **T05** (donante crea intención válida → 201, pendiente, sin cargo) en `backend/test/integration/donations.test.ts`. **[MVP]** — CA-05.1
- [X] T038 [P] [HU-05] Escribir y ejecutar **T06** (repite clave y payload idénticos → mismo resultado, una sola donación) en `backend/test/integration/donations.test.ts`. **[MVP]** — CA-05.4
- [X] T039 [P] [HU-05] Escribir y ejecutar **T07** (repite clave con payload distinto → 409) en `backend/test/integration/donations.test.ts`. **[MVP]** — CA-05.4
- [X] T040 [P] [HU-07] Escribir y ejecutar **T09** (donante consulta donación ajena → 403/404 sin filtración, prueba BOLA) en `backend/test/integration/donations.test.ts`. **[MVP]** — CA-07.2 — *requirió agregar `GET /v1/donations/{donationId}`, no presente en el contrato original (ver `contracts/api.md`, corrección de omisión)*
- [X] T041 [P] [HU-07] Escribir y ejecutar **T12** (gestor consulta historial de un donante → 403/404) en `backend/test/integration/donations.test.ts`. **[MVP]** — CA-04.2 — *verificado en ambos endpoints: `GET /v1/donations/me` (403 vía `requireGroup`) y `GET /v1/donations/{donationId}` (403)*

### Implementación

- [X] T042 [HU-05] Implementar el modelo de acceso a `Donation` e `IdempotencyRecord` en `backend/src/donations/repository.ts`, con `amountCents` entero entre 100 y 100000 (regla de [data-model.md](./data-model.md)). **[MVP]** — HU-05
- [X] T043 [HU-05] Implementar `POST /v1/donations` en `backend/src/donations/createDonation.ts`: valida proyecto `PUBLICADO` (404/409), monto con el esquema Zod de T019 (400 si inválido), exige cabecera `Idempotency-Key` (UUID, 400 si falta), obtiene `donorSub` solo del contexto del authorizer (T016). **[MVP]** — CA-05.1, CA-05.2, CA-05.3, CA-05.5
- [X] T044 [HU-05] Implementar en `backend/src/donations/createDonation.ts` la escritura atómica (`TransactWriteItems` condicionado) del `IdempotencyRecord` (`payloadHash` SHA-256) y la `Donation` `PENDIENTE_SIMULACION`: mismo `payloadHash` devuelve la respuesta almacenada; `payloadHash` distinto devuelve 409; falla de condición responde 409 sin efectos parciales. **[MVP]** — CA-05.4; RNF-HU-04 (CA-NF04.2) — *la desambiguación duplicado/conflicto hace una lectura posterior a la transacción fallida (no forma parte de la escritura atómica en sí, que ya quedó resuelta por DynamoDB)*
- [X] T045 [HU-07] Implementar `GET /v1/donations/me` (lista solo registros del `sub` autenticado, con fecha/importe/proyecto/estado) en `backend/src/donations/listMyDonations.ts`. **[MVP]** — CA-07.1
- [X] T046 [HU-07] Asegurar en `backend/src/donations/getDonation.ts` que consultar una donación de otro `sub`, o que un `GESTOR` consulte el historial de un donante, responde 403 o 404 sin revelar datos. **[MVP]** — CA-07.2, CA-04.2 — *se agregó la ruta `GET /v1/donations/{donationId}` a `infra/template.yaml` y `contracts/api.md` para que esta tarea sea ejecutable como endpoint real, no solo como función interna*
- [X] T047 [P] [HU-05] Implementar el formulario de donación (React Hook Form + Zod, reutilizando el esquema de T019) en `frontend/src/pages/DonationForm.tsx`, generando un UUID como `Idempotency-Key` por envío. **[MVP]** — CA-05.1, CA-05.5
- [X] T048 [P] [HU-07] Implementar la página de historial propio en `frontend/src/pages/MyDonations.tsx` (TanStack Query sobre `GET /v1/donations/me`). **[MVP]** — CA-07.1

**Checkpoint**: HU-05 y HU-07 funcionales de forma independiente; T04–T07, T09, T12 con evidencia
(design.md §9, día 4).

---

## Phase 5: HU-06, HU-11 — Simulación, concurrencia y MFA — Día 5 (design.md §9) — **[MVP]**

**Goal**: un donante simula la confirmación de su propia donación sin doble conteo bajo concurrencia; las
cuentas privilegiadas exigen MFA (entregable: HU-06, HU-11; T08, T13, T14; CloudFront + CSP — design.md
§9).

**Independent Test**: sobre una donación `PENDIENTE_SIMULACION` de la Fase 4, se disparan 10 solicitudes
de simulación concurrentes y solo una modifica el acumulado; un usuario `GESTOR` no puede iniciar sesión
sin el segundo factor.

### Tests para esta fase

- [ ] T049 [P] [HU-06] Escribir y ejecutar **T08** (10 confirmaciones concurrentes de la misma donación → un solo incremento) en `backend/test/integration/simulate.test.ts`. **[MVP]** — CA-06.2; RNF-HU-04 (CA-NF04.1)
- [ ] T050 [P] [HU-03] Escribir y ejecutar **T13** (token revocado usado antes de expirar → aceptado hasta expirar, limitación documentada; rechazado después) en `backend/test/integration/auth.test.ts`. **[MVP]** — CA-03.4
- [ ] T051 [P] [HU-11] Escribir y ejecutar **T14** (usuario GESTOR inicia sesión sin segundo factor → no obtiene tokens) con evidencia (captura o prueba) en `evidence/`. **[MVP]** — CA-11.2

### Implementación

- [X] T052 [HU-06] En `infra/template.yaml`, condicionar el despliegue de la ruta `POST /v1/donations/{donationId}/simulate` exclusivamente al stage `academic` (la ruta no debe existir en otro stage). **[MVP]** — CA-06.1 — *`Condition: IsAcademicStage` en `SimulateDonationFunction` y su LogGroup; `sam validate --lint` y `sam build` en verde*
- [X] T053 [HU-06] Implementar `POST /v1/donations/{donationId}/simulate` en `backend/src/donations/simulateDonation.ts`: exige propiedad (`donorSub` = `sub` autenticado), transición solo desde `PENDIENTE_SIMULACION`. **[MVP]** — CA-06.1 — *403 si no es propietario, 404 si no existe, 409 si ya no está `PENDIENTE_SIMULACION`*
- [X] T054 [HU-06] Implementar en `backend/src/donations/simulateDonation.ts` la transacción atómica (`TransactWriteItems` condicionado a `status = PENDIENTE_SIMULACION` y `donorSub = :sub`) que actualiza la donación e incrementa `confirmedAmountCents` del proyecto solo en la primera transición válida; transición inválida devuelve 409; `RECHAZADA_SIMULADA` no incrementa el agregado. **[MVP]** — CA-06.2, CA-06.3; RNF-HU-04 (CA-NF04.1, CA-NF04.2) — *test T08 en `backend/test/integration/simulate.test.ts` (10 solicitudes paralelas, rojo→verde): 1 éxito, 9 conflictos 409, un solo incremento; verificado localmente, no contra el stage real (no desplegado todavía)*
- [ ] T055 [P] [HU-06] Mostrar en `frontend/src/pages/DonationForm.tsx` y `frontend/src/pages/MyDonations.tsx` el aviso «Simulación académica: no se ha realizado ningún cobro» tras cualquier resultado de simulación. **[MVP]** — CA-06.4
- [ ] T056 [HU-03] Registrar en `backend/test/integration/auth.test.ts` la evidencia de la limitación de revocación del JWT authorizer (CA-03.4) en `docs/threat-model.md`, sección "Limitaciones conocidas". **[MVP]** — CA-03.4
- [ ] T057 [HU-11] Verificar en consola de Cognito (o prueba automatizada) que un usuario `GESTOR` sin MFA configurado no completa el inicio de sesión; documentar evidencia en `evidence/`. **[MVP]** — CA-11.2
- [ ] T058 [P] Verificar que CloudFront entrega CSP, HSTS, `X-Content-Type-Options` y `Referrer-Policy` (configurados en T022) sobre el stage desplegado; documentar en `evidence/`. **[MVP]** — RNF-HU-11 (CA-NF11.2)

**Checkpoint**: HU-06 y HU-11 funcionales; T08, T13, T14 con evidencia; CloudFront + CSP verificados
(design.md §9, día 5).

---

## Phase 6: Endurecimiento y extensiones — Día 6 (design.md §9) — **[MVP] + [Extensión — HU-10/HU-12]**

**Goal**: revisar IAM, logs, accesibilidad y rendimiento (**[MVP]**); añadir, si el equipo decide
abordarlas, las extensiones HU-10 y HU-12, marcadas "opcional" por design.md §9 (**[Extensión]**).

**Independent Test [MVP]**: una función Lambda sin permiso de escritura recibe `AccessDenied` al
intentar escribir en DynamoDB; las pantallas cumplen WCAG 2.2 AA aplicable a 375 px; el P95 de lecturas
con 50 proyectos es ≤ 1.5 s.
**Independent Test [Extensión — HU-10]**: un AUDITOR con MFA consulta `/v1/audit` filtrando por tipo y
fecha; otros roles reciben 403.
**Independent Test [Extensión — HU-12]**: T03, T09 y T12 producen el mismo resultado con Amazon Verified
Permissions/Cedar que con el motor embebido.

### Endurecimiento — **[MVP]**

- [ ] T059 [P] Ejecutar **T10** (la función Lambda de listado intenta escribir en DynamoDB → `AccessDenied`, prueba controlada o IAM Policy Simulator) y documentar en `evidence/`. **[MVP]** — RNF-HU-03 (CA-NF03.1)
- [ ] T060 [P] Revisar en `infra/template.yaml` que ninguna política IAM use `Action: "*"` o `Resource: "*"` injustificado; documentar la revisión en `docs/threat-model.md`. **[MVP]** — RNF-HU-03 (CA-NF03.2)
- [ ] T061 [P] Evaluar criterios WCAG 2.2 AA aplicables sobre catálogo, detalle, donación y confirmación a 375 px de ancho (`frontend/src/pages/*.tsx`); documentar hallazgos en `evidence/`. **[MVP]** — RNF-HU-06 (CA-NF06.1, CA-NF06.2)
- [ ] T062 [P] Medir el P95 de `GET /v1/projects` con 50 proyectos cargados (método, herramienta y condiciones documentados); evidencia en `evidence/`. **[MVP]** — RNF-HU-05 (CA-NF05.1, CA-NF05.2)
- [ ] T063 [P] Verificar en CloudWatch al menos un caso exitoso y uno rechazado (401/403), y en CloudTrail los cambios de infraestructura; evidencia en `evidence/`. **[MVP]** — RNF-HU-07 (CA-NF07.2)
- [ ] T064 [P] Ejecutar `npm audit` y revisar alertas de Dependabot en el CI; documentar en `evidence/`. **[MVP]** — design.md §6.2
- [ ] T065 Completar la tabla de mapeo a los 7 principios de NIST SP 800-207 y a PE/PA/PEP en `docs/threat-model.md` (iniciada en T008). **[MVP]** — RNF-HU-02 (CA-NF02.3)

### Extensión — HU-10 (Consultar auditoría) — **[Extensión]**

- [ ] T066 [P] [HU-10] Implementar `GET /v1/audit` (solo grupo `AUDITOR` con MFA, filtros por tipo y fecha contra la tabla `AuditEvents`) en `backend/src/audit/queryEvents.ts`. **[Extensión]** — CA-10.1
- [ ] T067 [HU-10] Asegurar que cada evento devuelto incluye `timestamp`, `requestId`, actor seudonimizado, recurso, acción y resultado, y nunca tokens, claves ni datos financieros. **[Extensión]** — CA-10.2
- [ ] T068 [P] [HU-10] Implementar la página de consulta de auditoría en `frontend/src/pages/AuditLog.tsx`, visible solo a `AUDITOR`. **[Extensión]** — CA-10.1

### Extensión — HU-12 (Autorización externalizada) — **[Extensión]**

- [ ] T069 [HU-12] Expresar en Cedar, en `policies/`, las reglas de autorización de HU-04, HU-07 y HU-08. **[Extensión]** — CA-12.1
- [ ] T070 [HU-12] Configurar Amazon Verified Permissions en `infra/template.yaml` y adaptar `backend/src/authz/context.ts` para invocar `IsAuthorized` como motor externo. **[Extensión]** — CA-12.1
- [ ] T071 [HU-12] Re-ejecutar T03 (de T025), T09 (de T040) y T12 (de T041) contra el motor externo y documentar la comparación frente a la autorización embebida en el informe técnico. **[Extensión]** — CA-12.2

**Checkpoint**: revisión IAM (T10), logs, accesibilidad y rendimiento completados (**[MVP]**); HU-10/HU-12
implementadas solo si el equipo decide abordar la extensión, sin bloquear el cierre del MVP (design.md
§9, día 6: "opcional").

---

## Phase 7: Cierre — Día 7 (design.md §9) — **[MVP]**

**Purpose**: README, informe, mapeo NIST, `AI_USAGE.md`, demo y limpieza planificada (design.md §9).

- [ ] T072 Completar `README.md` con instrucciones de despliegue (`sam deploy`), configuración de la cuenta Free plan y procedimiento de eliminación de recursos (`sam delete`). **[MVP]** — RNF-HU-08 (CA-NF08.2); RNF-HU-09 (CA-NF09.2)
- [ ] T073 [P] Redactar el informe técnico con la tabla de mapeo NIST SP 800-207 (de T065) y el resumen de T01–T14 con evidencia. **[MVP]** — requirements.md §5, §7
- [ ] T074 [P] Completar `AI_USAGE.md` (herramienta/modelo, participantes, tareas asistidas, aportes IA con enlace a PR, validación humana, limitaciones), iniciado en T009. **[MVP]** — design.md §10
- [ ] T075 Preparar y ejecutar la demo con usuarios de prueba de los cuatro roles (Visitante, Donante, Gestor, Auditor). **[MVP]** — requirements.md §5 (Definition of Done)
- [ ] T076 Ejecutar la guía de validación de [quickstart.md](./quickstart.md) de extremo a extremo sobre el stage `academic` y archivar la evidencia final en `evidence/`. **[MVP]** — requirements.md §6
- [ ] T077 Ejecutar el procedimiento de limpieza (`sam delete`, vaciar y eliminar buckets S3, eliminar el user pool si no se borró con la pila) y verificar en Tag Editor/Resource Explorer que no queden recursos. **[MVP]** — RNF-HU-09 (CA-NF09.2)

**Checkpoint**: README, informe, mapeo NIST, `AI_USAGE.md`, demo realizada y recursos AWS eliminados
(design.md §9, día 7; requirements.md §5 Definition of Done).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Día 1 — Setup)**: sin dependencias; inicia de inmediato.
- **Phase 2 (Día 2 — Foundational)**: depende de Phase 1; **bloquea** todas las fases de historias de
  usuario (Phase 3–6).
- **Phase 3 (Día 3 — HU-01/02/08/09)**: depende de Phase 2. Es condición previa de Phase 4 (necesita un
  proyecto `PUBLICADO` para crear donaciones).
- **Phase 4 (Día 4 — HU-05/07)**: depende de Phase 3 (usa un proyecto publicado). Es condición previa de
  Phase 5 (necesita una donación `PENDIENTE_SIMULACION`).
- **Phase 5 (Día 5 — HU-06/11)**: depende de Phase 4.
- **Phase 6 (Día 6 — Endurecimiento + Extensión)**: depende de Phase 2 (T059–T065) y, para HU-12
  (T069–T071), de que HU-04/HU-07/HU-08 (Phase 2/3/4) ya tengan pruebas pasando.
- **Phase 7 (Día 7 — Cierre)**: depende de todas las fases anteriores que el equipo decida entregar.

Esta cadena reproduce exactamente el orden de días 1–7 de design.md §9; no se reordena, divide ni
fusiona ningún día.

### Within Each Phase

- Los tests de aceptación T0x se escriben y ejecutan junto con (o inmediatamente después de) la
  implementación que validan, dentro de la misma fase/día — no antes de que exista infraestructura
  desplegable, dado que son pruebas de integración contra el stage académico, no pruebas unitarias
  previas al código.
- Dentro de cada historia: modelo/repositorio → endpoint backend → página frontend.

### Parallel Opportunities

- Todas las tareas marcadas `[P]` dentro de una misma fase pueden ejecutarse en paralelo (archivos
  distintos, sin dependencia entre sí).
- Con 4–5 integrantes (design.md §9 "Roles sugeridos"): el líder técnico/DevOps puede avanzar T010–T015 y
  T022 mientras identidad/seguridad avanza T011–T012, T016, T020–T021; backend y frontend se reparten las
  tareas de cada fase de historia una vez cerrada la Fase 2.

---

## Parallel Example: Phase 3 (Día 3)

```bash
# Tests en paralelo:
Task: "T024 [P] [HU-01] Escribir y ejecutar T01 en backend/test/integration/projects.test.ts"
Task: "T025 [P] [HU-08] Escribir y ejecutar T03 en backend/test/integration/projects.test.ts"

# Frontend en paralelo una vez listos los endpoints:
Task: "T033 [P] [HU-01] Página de catálogo en frontend/src/pages/Catalog.tsx"
Task: "T034 [P] [HU-02] Página de detalle en frontend/src/pages/ProjectDetail.tsx"
Task: "T035 [P] [HU-08] Página de gestión de proyectos en frontend/src/pages/ManageProjects.tsx"
```

---

## Implementation Strategy

### MVP primero (Phases 1–5, 7; Phase 6 sin las tareas de Extensión)

1. Completar Phase 1 (Día 1) y Phase 2 (Día 2 — bloqueante).
2. Completar Phase 3 (Día 3) → **validar de forma independiente** HU-01/02/08/09 con T01, T03.
3. Completar Phase 4 (Día 4) → validar HU-05/07 con T04–T07, T09, T12.
4. Completar Phase 5 (Día 5) → validar HU-06/11 con T08, T13, T14.
5. Completar las tareas de endurecimiento de Phase 6 (T059–T065) → validar con T10 y las métricas de
   RNF-HU-05/06/07.
6. Completar Phase 7 (Día 7) → cierre, demo y limpieza.

### Entrega incremental

Cada fase (día) agrega valor demostrable sin romper la anterior, siguiendo el hito sugerido por
design.md §9 ("demo de login y catálogo" al final del día 3) y el checkpoint declarado al final de cada
fase arriba.

### Extensión (opcional, no bloqueante — design.md §9 día 6: "HU-10/HU-12 opcional")

Las tareas T066–T071 (HU-10, HU-12) se abordan únicamente si el equipo tiene margen tras completar el
MVP completo (Phases 1–5, 7, y el endurecimiento de Phase 6); no desplazan ni retrasan ninguna tarea
**[MVP]**.

---

## Notes

- **[HU-xx]** sustituye al marcador genérico `[USx]` del template de tareas de Spec Kit: se usa el
  identificador de historia original (`HU-01`...`HU-12`) para que cada tarea quede trazada de forma
  directa e inequívoca a requirements.md, conforme al principio constitucional de Trazabilidad de
  requisitos. Las tareas de test llevan además, en el texto de la descripción, el identificador `T0x`
  exacto de requirements.md §6 que ejecutan.
- `[P]` = archivos distintos, sin dependencias entre sí.
- Cada fase corresponde a exactamente un día de design.md §9; los "Checkpoint" de cada fase son los
  entregables verificables que ese mismo documento define para ese día.
- No se añadió ninguna tarea que implemente un control de seguridad simplificado o distinto al descrito
  en plan.md/data-model.md/contracts/api.md.
