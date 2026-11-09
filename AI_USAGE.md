# AI_USAGE.md — Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

Declaración obligatoria de uso de asistentes de IA, conforme a [design.md §10](./design.md). Cada fila
cubre un bloque de trabajo entregado por PR; se completa a medida que el equipo fusiona cambios.

| Herramienta/modelo | Participantes | Tareas asistidas | Aportes IA (PR) | Validación humana | Limitaciones |
|---|---|---|---|---|---|
| Claude Code (Claude Sonnet 5) | _(pendiente)_ | Fase 1 (Setup, T001–T009): estructura de repositorio, configuración TypeScript/ESLint/Prettier/Vitest, pipeline CI, plantilla de PR, README (cuenta AWS Free plan, flujo de trabajo), borrador de threat-model.md | _(pendiente de enlace a PR)_ | Ejecución local de `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; test de humo T001 (existencia de la estructura de carpetas) escrito antes de crear la estructura y mostrado en rojo, luego en verde | Ningún código de aplicación (Fases 2+) fue generado en este bloque; la creación real de la cuenta AWS, de los usuarios IAM y de la protección de rama en GitHub quedan como pasos manuales pendientes, documentados pero no ejecutados por el agente |

## Reglas aplicadas (design.md §10)

- Todo cambio generado por IA entra por PR y es revisado por un integrante distinto de quien lo generó.
- No se compartieron con el asistente credenciales AWS, tokens, contenidos de `.env` ni datos personales
  reales.
- El agente no ejecutó despliegues ni comandos sobre una cuenta AWS real; las acciones de infraestructura
  de esta fase (cuenta, usuarios IAM, protección de rama) quedaron documentadas en
  [README.md](./README.md) como procedimiento manual pendiente.
- Los controles de seguridad futuros (authz, idempotencia, políticas IAM) deberán tener pruebas escritas
  o revisadas por el equipo antes de aceptarse.
