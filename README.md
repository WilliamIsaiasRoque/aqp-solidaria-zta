# Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

Prototipo académico cloud-native serverless con modelo de seguridad Zero Trust (NIST SP 800-207) para el
curso Tópicos Avanzados en Ingeniería de Software (EPIS, UNSA). **No procesa donaciones ni datos de pago
reales.** Fuente de verdad funcional y técnica: [requirements.md](./requirements.md) y
[design.md](./design.md). Especificación, plan y tareas de este primer feature:
[specs/001-plataforma-donaciones-seguras/](./specs/001-plataforma-donaciones-seguras/).

> **Estado actual (12 nov 2026)**: infraestructura base y catálogo/API públicos desplegados en
> `academic` (`us-east-2`). La SPA, las donaciones y la simulación funcionan en código local, con
> pruebas automatizadas; sus cambios recientes de infraestructura y la SPA estática aún no se han
> publicado. CloudFront responde 403 al pedir `/` y el preflight CORS del API responde 404. El
> despliegue y las pruebas autenticadas por rol quedan pendientes de una sesión AWS del equipo.

## Estructura del repositorio

Reproduce exacta la estructura de [design.md §8](./design.md):

```text
frontend/src/{pages,components,auth,services}/   # SPA React + Vite + Tailwind
backend/src/{projects,donations,authz,audit,shared}/  # API Node.js en Lambda
backend/test/
infra/                                           # AWS SAM — template.yaml
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
npm test        # Vitest (backend, frontend y smoke test)
npm run build   # genera dist/frontend para S3
npm run dev     # SPA local en http://127.0.0.1:5173
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
3. **Día 1 (T004)** — Se fija **una sola región** para todo el proyecto: **`us-east-2`** (decisión de
   equipo que sustituye la recomendación original `us-east-1` de design.md; `infra/template.yaml` usa
   esta región) y se configura una **alerta en AWS Budgets** antes de desplegar cualquier recurso.
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

**Región fijada**: **`us-east-2`** (decisión de equipo; sustituye la recomendación original `us-east-1`
de design.md). Confirmado: AWS asigna la región automáticamente según el país de contacto de la cuenta
(Perú → `us-east-2`) en este tipo de cuenta AWS Free plan 2026; no es configurable sin pasar a una cuenta
"advanced" (ver [docs oficiales](https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html)).

**Alerta de AWS Budgets**: configurada — presupuesto `aqp-solidaria-zero-spend`, tipo "Zero spend budget",
umbral $1.00 USD, notificación a `wroquequi@unsa.edu.pe`.

## Recursos desplegados (stage `academic`)

Desplegado el 2026-11-09 desde AWS CloudShell con `sam deploy --guided` (stack
`aqp-solidaria-zta-academic`, región `us-east-2`). Salidas de CloudFormation:

| Recurso | Valor |
|---|---|
| User Pool ID | `us-east-2_caprohzIP` |
| User Pool Client ID | `46biqan84afjjvg3gkqnbaf91` |
| Hosted UI Domain | `https://aqp-solidaria-zta-2026.auth.us-east-2.amazoncognito.com` |
| CloudFront Domain | `d3if5n1ucewbp.cloudfront.net` |
| API Gateway (HTTP API) | `https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com` |

Estos valores no son secretos (son identificadores de cliente público con PKCE, sin client secret), pero
son específicos de esta cuenta — el equipo los reutiliza en la configuración de frontend/backend en las
fases siguientes en vez de volver a buscarlos. `samconfig.toml` queda en CloudShell para repetir
`sam deploy` sin las preguntas guiadas.

## SPA: ejecución y publicación (T078–T089)

La SPA usa React, Vite, Tailwind y React Router. El login usa Cognito Authorization Code + PKCE;
`oidc-client-ts` guarda el usuario y sus tokens en memoria. Una recarga completa pierde la sesión local
y requiere ingresar de nuevo. Las guardias de la interfaz solo ordenan la experiencia: API Gateway y
las funciones Lambda vuelven a verificar el JWT, el grupo y la propiedad de cada recurso.
Los scopes solicitados son `openid email profile api/projects.write api/donations.write
api/donations.read`. El plan menciona React Router 8.x; el lockfile usa 7.x, la versión estable
disponible al integrar este bloque.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

El desarrollo local usa un proxy Vite `/api` hacia el stage `academic` para consultar el catálogo sin
alterar CORS de producción. El bundle de producción consulta el API público. Los siguientes valores
son identificadores públicos, no secretos; se pueden sobrescribir antes de `npm run build` mediante
un `frontend/.env.local` no versionado:

| Variable | Valor de este laboratorio |
|---|---|
| `VITE_API_BASE_URL` | `https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com/academic` |
| `VITE_COGNITO_USER_POOL_ID` | `us-east-2_caprohzIP` |
| `VITE_COGNITO_CLIENT_ID` | `46biqan84afjjvg3gkqnbaf91` |
| `VITE_COGNITO_DOMAIN` | `https://aqp-solidaria-zta-2026.auth.us-east-2.amazoncognito.com` |

Para publicar desde AWS CloudShell con la sesión IAM temporal del equipo, ejecutar
`bash scripts/publish-spa.sh` desde la raíz del repositorio. El script valida el código, compila,
actualiza el stack SAM (callback/logout HTTPS, CORS y CSP), obtiene el nombre del bucket y el ID
de la distribución desde las salidas de CloudFormation, sincroniza solo `dist/frontend/assets`,
sube `index.html` sin caché e invalida CloudFront. Acepta el nombre del stack como primer argumento
y las variables `AWS_REGION`, `COGNITO_DOMAIN_PREFIX` y `SPA_ORIGIN` si se despliega otra instancia.
Se requiere Node compatible con Vite 8, AWS CLI, SAM CLI y permisos IAM para CloudFormation, S3 y
CloudFront. La publicación no solicita ni almacena credenciales AWS en el repositorio.

Verificar después de publicar:

```bash
curl -I https://d3if5n1ucewbp.cloudfront.net/
curl -I https://d3if5n1ucewbp.cloudfront.net/proyectos
curl -i -X OPTIONS 'https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com/academic/v1/projects' \
  -H 'Origin: https://d3if5n1ucewbp.cloudfront.net' \
  -H 'Access-Control-Request-Method: GET'
```

Las rutas profundas vuelven a `index.html` por la configuración de errores 403/404 de CloudFront.
Para revertir la SPA, reconstruir el commit anterior, volver a sincronizar sus archivos con el mismo
script y crear una nueva invalidación. Si el cambio problemático es de SAM, revertir el commit de
infraestructura y ejecutar `sam build`/`sam deploy` antes de republicar. No usar `sam delete` como
rollback: destruiría los recursos del laboratorio.

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
