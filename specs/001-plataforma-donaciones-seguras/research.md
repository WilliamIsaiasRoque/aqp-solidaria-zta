# Research: Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

**Fecha**: 2026-11-08 | **Fuente única**: [design.md](../../design.md)

## Nota de alcance

Por instrucción explícita del usuario, este plan usa design.md como **única fuente** de arquitectura,
stack, endpoints, modelo de datos y orden de trabajo, sin proponer alternativas ni reinterpretar lo ya
decidido allí. En consecuencia, esta fase de investigación no evalúa opciones tecnológicas nuevas: su
propósito es únicamente confirmar que no quedan `NEEDS CLARIFICATION` en el Technical Context del plan y
documentar, para cada decisión ya fijada, su referencia exacta en design.md. No se registran
"alternativas consideradas" porque design.md ya cerró esas decisiones (design.md §2, nota: "ante
incompatibilidades entre versiones mayores, el equipo elige la combinación estable y la justifica en el
README" — es la única apertura permitida, y no es una alternativa arquitectónica sino una tolerancia de
versión).

## Estado de los `NEEDS CLARIFICATION`

El Technical Context de [plan.md](./plan.md) no contiene marcadores `NEEDS CLARIFICATION`: todos los
campos (Language/Version, Primary Dependencies, Storage, Testing, Target Platform, Project Type,
Performance Goals, Constraints, Scale/Scope) se completaron directamente con el contenido textual de
design.md §1, §2, §4, §5 y §6.3. No se requieren tareas de investigación adicionales.

## Decisiones (transcritas de design.md, sin alternativas)

- **Decision**: TypeScript como lenguaje único para frontend y backend, compartiendo tipos.
  **Rationale**: "Tipos compartidos frontend/backend" (design.md §2).
  **Alternatives considered**: ninguna — decisión fijada por design.md; el único grado de libertad que
  design.md permite es la versión exacta ante incompatibilidades mayores, documentada en el README.

- **Decision**: React 19.3.x + Vite 8.3.x + Tailwind CSS 4.x para la SPA; Bootstrap prohibido.
  **Rationale**: "SPA accesible"; "Diseño responsive; prohibido Bootstrap" (design.md §2).
  **Alternatives considered**: ninguna — SSR/Next.js se descarta explícitamente ("No se recomienda SSR
  ni Next.js", design.md §2), no como alternativa evaluada sino como exclusión declarada del documento.

- **Decision**: `oidc-client-ts` (o AWS Amplify Auth) para Authorization Code + PKCE, tokens en memoria.
  **Rationale**: cumplir CA-03.1 (PKCE obligatorio) y RNF-HU-11 (tokens no persistentes en el navegador)
  (design.md §2).
  **Alternatives considered**: ninguna — el flujo implícito está explícitamente prohibido por
  requirements.md CA-03.1.

- **Decision**: Node.js 24 (`nodejs24.x`) en AWS Lambda, una función por caso de uso o módulo, con un rol
  IAM propio por función.
  **Rationale**: "Runtime administrado vigente"; "Roles IAM separados por función" (design.md §2, AD-06).
  **Alternatives considered**: ninguna.

- **Decision**: Amazon API Gateway HTTP API con JWT authorizer como Policy Enforcement Point.
  **Rationale**: "HTTPS, JWT authorizer, throttling por stage" (design.md §2); mapeo NIST PEP (design.md
  §6.1).
  **Alternatives considered**: ninguna — REST API solo se menciona como alternativa si se requiriera WAF
  (limitación documentada en design.md §6.3, no una decisión abierta de este plan).

- **Decision**: Amazon Cognito User Pool (plan Lite o Essentials) con grupos `DONANTE`/`GESTOR`/`AUDITOR`
  y MFA TOTP.
  **Rationale**: "OIDC, MFA TOTP, 10.000 MAU gratis" (design.md §2); PA en el mapeo NIST (design.md §6.1).
  **Alternatives considered**: ninguna — MFA por SMS está explícitamente excluido (design.md §7: "Evitar
  MFA por SMS").

- **Decision**: módulo `authz` embebido en Lambda (RBAC + ownership) para el MVP; Amazon Verified
  Permissions + Cedar como Policy Engine externo para la extensión HU-12.
  **Rationale**: AD-08 — "Autorización en dos niveles" (design.md §1).
  **Alternatives considered**: ninguna — ambos niveles están definidos por el propio documento, no son
  alternativas entre sí sino un MVP y una extensión con puntuación adicional (requirements.md HU-12).

- **Decision**: Amazon DynamoDB on-demand como única persistencia (`Projects`, `Donations`, `Idempotency`,
  `AuditEvents`).
  **Rationale**: "Proyectos, donaciones, idempotencia y auditoría" (design.md §2); claves e índices
  definidos en design.md §5.
  **Alternatives considered**: ninguna.

- **Decision**: S3 privado + CloudFront con OAC y response headers policy para publicar la SPA.
  **Rationale**: "TLS, CSP y cabeceras de seguridad" (design.md §2); RNF-HU-11.
  **Alternatives considered**: ninguna.

- **Decision**: CloudWatch Logs (retención 14 días) + CloudTrail para observabilidad.
  **Rationale**: "Logs JSON y auditoría de infraestructura" (design.md §2); RNF-HU-07.
  **Alternatives considered**: ninguna.

- **Decision**: AWS SAM / CloudFormation como único mecanismo de IaC.
  **Rationale**: "Infraestructura reproducible y eliminable" (design.md §2); RNF-HU-08 (CA-NF08.2).
  **Alternatives considered**: ninguna.

- **Decision**: Vitest 5.x + Testing Library + Bruno/Postman como stack de pruebas; ESLint 10.x +
  Prettier 3.x + typecheck para calidad; GitHub Actions para CI/CD.
  **Rationale**: "Unitarias, UI, API negativas"; "Validación en CI"; "CI obligatorio; despliegue por OIDC
  opcional" (design.md §2).
  **Alternatives considered**: ninguna.

## Conclusión de la Fase 0

Todas las decisiones técnicas provienen literalmente de design.md; no quedan incógnitas abiertas para la
Fase 1. El Constitution Check de plan.md ya confirmó que estas decisiones satisfacen los siete principios
constitucionales sin excepciones que requieran justificación en Complexity Tracking.
