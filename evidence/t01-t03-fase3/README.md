# Evidencia T01 / T03 — Fase 3 (catálogo y gestión de proyectos)

**Última actualización**: 2026-11-09 — se agrega la verificación real contra el stage `academic`
desplegado (`https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com/academic`), además de la prueba
local simulada original.

## 1. Verificación real contra el stage desplegado (2026-11-09)

### T01 — Visitante consulta proyectos → 200, sin borradores

Archivo: [`T01_sin_token_response.txt`](./T01_sin_token_response.txt)

```
GET /academic/v1/projects
HTTP/2 200
{"items":[]}
```

**Resultado**: ✅ `200` real contra `ListProjectsFunction` desplegada. El catálogo está vacío porque
todavía no se ha creado ningún proyecto en esta cuenta, lo cual también verifica, de paso, CA-01.3
(estado vacío sin errores técnicos). **Limitación de esta corrida**: al no existir ningún proyecto
`BORRADOR` ni `PUBLICADO` en la tabla, no se puede demostrar aquí, contra datos reales, que un
`BORRADOR` quede excluido de la lista (esa parte de CA-01.2 sí está cubierta por la prueba local de
`projects.test.ts`, que sí mezcla ambos estados). Para demostrarlo también en vivo haría falta que un
`GESTOR` cree un proyecto con `POST /v1/projects` y se vea que no aparece en este listado hasta
publicarlo.

### T03 — Donante intenta crear proyecto → 403

Archivo: [`T03_sin_token_response.txt`](./T03_sin_token_response.txt)

```
POST /academic/v1/projects
HTTP/2 401
{"message":"Unauthorized"}
```

**Resultado parcial — decisión de equipo (2026-11-09)**: la ruta `POST /v1/projects` está protegida
(401 sin token), lo cual confirma que el scope `api/projects.write` se exige de verdad en el API
Gateway desplegado. **T03 en sí (403 para un DONANTE autenticado) queda deliberadamente pendiente**:
el equipo decidió no crear todavía un usuario de prueba y posponer esta verificación a la Fase 4/5,
cuando el frontend esté desplegado y el login funcione de extremo a extremo (en vez de generar un
access token manualmente ahora). Hasta entonces, T03 se considera **parcialmente verificado**: el
caso "sin token" está confirmado en real; el caso "403 para donante autenticado" está confirmado solo
por la prueba local (sección 2) y se repetirá contra el stage real cuando exista login de prueba.

**Para completar esta verificación en la Fase 4/5**, una de estas opciones del equipo:
1. Crear un usuario de prueba en el grupo `DONANTE` (consola de Cognito o `aws cognito-idp
   admin-create-user` + `admin-add-user-to-group`), iniciar sesión vía el Hosted UI
   (`https://aqp-solidaria-zta-2026.auth.us-east-2.amazoncognito.com`) y pasar aquí el access token
   obtenido (nunca la contraseña) para repetir el `curl -H "Authorization: Bearer <token>"`.
2. Ejecutar la prueba manualmente y pegar el resultado (código HTTP + cuerpo) en este archivo.

Hasta entonces, T03 queda confirmado solo mediante la prueba local simulada (sección 2) y a nivel de
infraestructura (el endpoint exige un access token válido con el scope correcto).

## 2. Prueba local simulada (2026-11-09, sin cambios)

**Comando**: `npx vitest run backend/test/integration/projects.test.ts --reporter=verbose`
**Archivo**: [`test_run.txt`](./test_run.txt)

Esta prueba ejerce la lógica de los handlers (`listProjects`, `createProject`) con un repositorio en
memoria que implementa el mismo contrato (`ProjectsRepository`) que `dynamoDbProjectsRepository` — no
contra DynamoDB real.

| Prueba | Escenario | Resultado |
|---|---|---|
| T01 | Visitante consulta proyectos (lista con publicados y borradores mezclados) | 200, solo el publicado ✅ |
| T01 | Catálogo sin proyectos publicados (CA-01.3) | 200, `{ items: [] }`, sin error técnico ✅ |
| T03 | Donante (`cognito:groups: ["DONANTE"]`) intenta `POST /v1/projects` | 403 `FORBIDDEN` ✅ |
| — | Gestor (`cognito:groups: ["GESTOR"]`) crea proyecto (control positivo) | 201, estado `BORRADOR`, `AuditEvent` registrado ✅ |

Los logs JSON estructurados (`requestId`, `action`, `outcome`, `httpStatus`, `durationMs`) que emite
cada handler quedan capturados en `test_run.txt`, consistentes con RNF-HU-07 (CA-NF07.1).

## Resumen de cobertura

| Prueba | Lógica (local) | Infraestructura real (stage `academic`) |
|---|---|---|
| T01 — 200, sin borradores | ✅ (con datos mixtos) | ✅ 200 real; "sin borradores" no demostrado aún con datos reales (tabla vacía) |
| T03 — 403 para DONANTE | ✅ | ⏳ pendiente de un access token de prueba de un usuario `DONANTE` |
