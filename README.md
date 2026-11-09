# Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

Prototipo académico cloud-native serverless con modelo de seguridad Zero Trust (NIST SP 800-207) para el
curso Tópicos Avanzados en Ingeniería de Software (EPIS, UNSA). **No procesa donaciones ni datos de pago
reales.** Fuente de verdad funcional y técnica: [requirements.md](./requirements.md) y
[design.md](./design.md). Especificación, plan y tareas de este primer feature:
[specs/001-plataforma-donaciones-seguras/](./specs/001-plataforma-donaciones-seguras/).

> **Estado actual**: Fase 1 (Setup, T001–T009 de
> [tasks.md](./specs/001-plataforma-donaciones-seguras/tasks.md)) completada. Las fases 2–7 (infra,
> autenticación, proyectos, donaciones, simulación, endurecimiento y cierre) están pendientes.

## Estructura del repositorio

Reproduce exacta la estructura de [design.md §8](./design.md):

```text
frontend/src/{pages,components,auth,services}/   # SPA React + Vite + Tailwind (pendiente, Fase 2+)
backend/src/{projects,donations,authz,audit,shared}/  # API Node.js en Lambda (pendiente, Fase 2+)
backend/test/
infra/                                           # AWS SAM — template.yaml (pendiente, Fase 2)
policies/                                        # Cedar — extensión HU-12
docs/                                            # api.yaml (OpenAPI), threat-model.md
evidence/                                        # capturas sanitizadas, reportes de pruebas T01–T14
.github/workflows/ci.yml
```

## Requisitos previos (herramientas locales)

- Node.js 24.x (`node -v`)
- Una cuenta AWS Free plan configurada según la sección siguiente (solo necesaria desde la Fase 2)
- AWS SAM CLI (a partir de la Fase 2, para `sam build` / `sam deploy` / `sam delete`)

## Scripts disponibles

```bash
npm install     # instala dependencias de desarrollo (lint, typecheck, test, build)
npm run lint    # ESLint sobre todo el repositorio
npm run typecheck   # tsc --noEmit
npm test        # Vitest (suite actual: smoke test de estructura, T001)
npm run build   # placeholder hasta que exista código de aplicación (Fase 2+)
```

El pipeline de CI (`.github/workflows/ci.yml`) ejecuta exactamente estos cuatro pasos (`npm ci`, lint,
typecheck, test, build) en cada PR y en cada push a `main`.

## Cuenta AWS Free plan (RNF-HU-09, CA-NF09.1; design.md §7)

> Esta sección documenta el procedimiento que el equipo debe ejecutar manualmente en la consola de AWS;
> no se automatiza desde este repositorio porque requiere la creación de la cuenta y de usuarios IAM
> reales, fuera del alcance de un agente de código.

1. **Día 1 (T002)** — Un integrante crea la cuenta AWS **Free plan** (correo, teléfono y, posiblemente,
   tarjeta; solo se cobra si se pasa a Paid plan). Inmediatamente después, activa MFA en el usuario
   **root** y deja de usarlo para trabajar.
2. **Día 1 (T003)** — Se crea un usuario **IAM por integrante** con MFA habilitado y **sin llaves de
   acceso de larga duración**; para despliegues se usan AWS CloudShell o credenciales temporales
   (design.md §7). Cada integrante registra en este README el usuario IAM que le corresponde (nombre de
   usuario, sin credenciales).
3. **Día 1 (T004)** — Se fija **una sola región** para todo el proyecto (recomendado `us-east-1`) y se
   configura una **alerta en AWS Budgets** antes de desplegar cualquier recurso.
4. Antes de desplegar cualquier servicio (a partir de la Fase 2), se verifica que esté incluido en la
   [lista oficial de servicios del AWS Free plan](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html).
   Quedan excluidos del diseño: IAM Identity Center, AWS Organizations, AWS Verified Access, GuardDuty y
   Security Hub (design.md §1 AD-06).
5. Al cierre de la evaluación (Fase 7, T077) se ejecuta la limpieza: `sam delete`, vaciado y eliminación
   de buckets S3, eliminación del user pool de Cognito si no se borró con la pila, y verificación en Tag
   Editor / Resource Explorer de que no quedan recursos (design.md §7, RNF-HU-09 CA-NF09.2).

**Registro de usuarios IAM del equipo** (completar en el Día 1, sin credenciales ni secretos):

| Integrante | Usuario IAM | Rol sugerido (design.md §9) | MFA activado |
|---|---|---|:---:|
| _(pendiente)_ | _(pendiente)_ | _(pendiente)_ | _(pendiente)_ |

**Región fijada**: _(pendiente de completar el Día 1 — recomendado `us-east-1`)_.

**Alerta de AWS Budgets**: _(pendiente de completar el Día 1 — registrar el umbral configurado)_.

## Flujo de trabajo y control de cambios (T005)

- La rama `main` está protegida en GitHub: se configura manualmente en *Settings → Branches → Branch
  protection rules* exigiendo al menos 1 revisión aprobatoria antes de fusionar y que el workflow de CI
  (`build-and-test`) pase en verde. Ningún cambio se integra directamente sobre `main`.
- Todo cambio se entrega mediante un **Pull Request por bloque de trabajo** (ver
  [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md)) y requiere la revisión de **al
  menos un integrante distinto de quien lo generó**, incluyendo los cambios producidos o asistidos por
  agentes de IA.
- Los tests se escriben antes de implementar la funcionalidad correspondiente; un PR no se aprueba si
  introduce o modifica una regla de negocio, autorización o idempotencia sin pruebas automáticas que la
  respalden (RNF-HU-08, CA-NF08.1).
- Referencia completa de principios y flujo de trabajo:
  [.specify/memory/constitution.md](./.specify/memory/constitution.md).

## Uso de asistentes de IA

Declaración obligatoria de uso de IA en [AI_USAGE.md](./AI_USAGE.md), conforme a design.md §10.

## Advertencia

Especificación y prototipo de uso académico; no constituye evaluación de cumplimiento legal ni PCI DSS
para recaudación de fondos reales (requirements.md, nota final).
