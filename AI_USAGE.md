# AI_USAGE.md — Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

Declaración obligatoria de uso de asistentes de IA, conforme a [design.md §10](./design.md). Cada fila
cubre un bloque de trabajo entregado por PR; se completa a medida que el equipo fusiona cambios.

| Herramienta/modelo | Participantes | Tareas asistidas | Aportes IA (PR) | Validación humana | Limitaciones |
|---|---|---|---|---|---|
| Claude Code (Claude Sonnet 5) | _(pendiente)_ | Fase 1 (Setup, T001–T009): estructura de repositorio, configuración TypeScript/ESLint/Prettier/Vitest, pipeline CI, plantilla de PR, README (cuenta AWS Free plan, flujo de trabajo), borrador de threat-model.md | _(pendiente de enlace a PR)_ | Ejecución local de `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; test de humo T001 (existencia de la estructura de carpetas) escrito antes de crear la estructura y mostrado en rojo, luego en verde | Ningún código de aplicación (Fases 2+) fue generado en este bloque; la creación real de la cuenta AWS, de los usuarios IAM y de la protección de rama en GitHub quedan como pasos manuales pendientes, documentados pero no ejecutados por el agente |
| Claude Code (Claude Sonnet 5) | _(pendiente)_ | Fase 2 (Foundational, T010–T023): `infra/template.yaml` (Cognito + grupos + MFA TOTP, API Gateway HTTP API con JWT authorizer, tablas DynamoDB, Lambda `authCheck` foundational, CloudFront+OAC+cabeceras de seguridad), `backend/src/authz/context.ts`, `backend/src/shared/{logger,errors,schemas}.ts`, `frontend/src/auth/{oidc,session}.ts`; corrección de la región a `us-east-2` en todo el repositorio por decisión de equipo | _(pendiente de enlace a PR)_ | `sam validate --lint` y `sam build` sobre `infra/template.yaml` (ambos en verde); tests de `backend/test/integration/auth.test.ts` (T02/T11) y `frontend/test/auth/session.test.ts` (CA-03.3) escritos antes de la implementación y mostrados en rojo, luego en verde; `npm run lint/typecheck/test/build` en verde | La verificación de T02/T11 contra el stage `academic` realmente desplegado (incluida la validación de firma de API Gateway) no se ejecutó: requiere `sam deploy` con la cuenta AWS real, pendiente desde la Fase 1; la exigencia de MFA específica por grupo (GESTOR/AUDITOR) no es expresable en CloudFormation y queda como procedimiento operativo documentado en `docs/threat-model.md` |

## Reglas aplicadas (design.md §10)

- Todo cambio generado por IA entra por PR y es revisado por un integrante distinto de quien lo generó.
- No se compartieron con el asistente credenciales AWS, tokens, contenidos de `.env` ni datos personales
  reales.
- El agente no ejecutó despliegues ni comandos sobre una cuenta AWS real; las acciones de infraestructura
  de esta fase (cuenta, usuarios IAM, protección de rama) quedaron documentadas en
  [README.md](./README.md) como procedimiento manual pendiente.
- Los controles de seguridad futuros (authz, idempotencia, políticas IAM) deberán tener pruebas escritas
  o revisadas por el equipo antes de aceptarse.
