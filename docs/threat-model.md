# Threat Model — Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

**Estado**: borrador inicial (Fase 1, T008). Se completa en fases posteriores (T017 logging, T056
limitación de revocación, T060 revisión IAM, T065 mapeo NIST final).

## STRIDE resumido (a completar con detalle por componente en fases posteriores)

| Categoría STRIDE | Amenaza relevante para este sistema | Control previsto | Bloque |
|---|---|---|---|
| Spoofing | Suplantar la identidad de un donante o gestor | Amazon Cognito (Authorization Code + PKCE), JWT authorizer | MVP |
| Tampering | Alterar el monto o el estado de una donación en tránsito o en servidor | Backend autoritativo; dinero en céntimos enteros; `TransactWriteItems` condicionado | MVP |
| Repudiation | Negar haber realizado una acción crítica (crear/publicar proyecto, confirmar donación) | `AuditEvent` con actor, fecha, acción, resultado | MVP |
| Information Disclosure | Leer el historial de donaciones de otro usuario (BOLA) o datos de auditoría sensibles | Ownership por `sub`; `AuditEvent` sin tokens/claves/datos financieros | MVP |
| Denial of Service | Abuso o fuerza bruta contra el login o la API | Throttling del stage HTTP API; protecciones de Cognito | MVP |
| Elevation of Privilege | Un donante ejecuta una operación reservada a gestor o auditor | RBAC por `cognito:groups`, validado siempre en backend | MVP |

## Mapeo a NIST SP 800-207 (completar en T065; transcrito de design.md §6.1)

| Componente NIST | Implementación prevista |
|---|---|
| Policy Enforcement Point (PEP) | API Gateway HTTP API con JWT authorizer y scopes; CloudFront para el frontend |
| Policy Engine (PE) | Módulo `authz` en Lambda (MVP) o Amazon Verified Permissions con Cedar (extensión HU-12) |
| Policy Administrator (PA) | Cognito: emite, renueva y revoca tokens de sesión |
| Fuentes de información | Claims de Cognito, estado del recurso en DynamoDB, logs de CloudWatch y CloudTrail |

_(La tabla completa de los 7 principios de NIST SP 800-207, con evidencia T0x por principio, se añade en
T065 — Fase 6, tras tener los endpoints y pruebas implementados.)_

## Limitaciones conocidas (transcrito de design.md §6.3; se amplía con evidencia en T056)

- El JWT authorizer valida tokens localmente: un access token revocado sigue siendo válido hasta su
  expiración (CA-03.4). Mitigación: vida corta del access token (≤ 15 min).
- **Evidencia T13 (Fase 5, T056)**: `backend/test/integration/auth.test.ts`, describe "T13 — límite
  de revocación: aceptado hasta expirar, rechazado después (CA-03.4)", demuestra en código esta
  limitación: (a) un token con claims válidos y `exp` vigente se acepta sin excepción, aunque
  hipotéticamente estuviera revocado — no existe ningún claim de "revocado" que `getAuthContext`
  (`backend/src/authz/context.ts`) pueda inspeccionar, por lo que la única mitigación real es la
  vida corta del access token (≤ 15 min, CA-03.3); (b) como defensa adicional (Principio
  constitucional II — Backend autoritativo), `getAuthContext` SÍ valida el claim `exp` cuando está
  presente y rechaza con 401 un token ya expirado, sin depender únicamente de que lo haga el JWT
  authorizer de API Gateway. La verificación de que un token *realmente revocado* vía
  `/oauth2/revoke` (CA-03.3) sigue siendo aceptado hasta su expiración natural, contra el stage
  real desplegado, requiere ejecutar un flujo de login + logout + reintento con un usuario de
  prueba — no realizado en este Lambda-level test; queda para una verificación manual con
  evidencia (captura) cuando exista login de prueba end-to-end (Fase 3+ / quickstart.md
  Escenario 6).
- Sin postura de dispositivo ni evaluación continua de riesgo (AWS Verified Access y Cognito Plus no
  disponibles sin costo en el AWS Free plan).
- HTTP API no se integra con AWS WAF.
- Cuenta compartida por el equipo: el aislamiento entre integrantes depende de IAM y de la disciplina del
  equipo.
- **MFA por grupo (T012, CA-11.1)**: CloudFormation/Cognito no permiten exigir MFA solo a grupos
  específicos (`GESTOR`, `AUDITOR`) a nivel de User Pool; `MfaConfiguration` se aplica por pool, no por
  grupo. `infra/template.yaml` habilita `SOFTWARE_TOKEN_MFA` como mecanismo disponible
  (`MfaConfiguration: OPTIONAL`); la exigencia efectiva para `GESTOR`/`AUDITOR` se activa de forma
  individual al crear cada usuario de esos grupos y se evidencia operativamente en la Fase 5 (T057:
  verificación de que un `GESTOR` sin segundo factor no completa el inicio de sesión).
- **Verificación de T02/T11 en la Fase 2**: `backend/test/integration/auth.test.ts` prueba localmente
  que el Lambda `authCheck` rechaza (401) un contexto de autorización ausente o un ID token usado como
  credencial, como defensa adicional (Principio constitucional II — Backend autoritativo). Además, tras
  el despliegue del stage `academic` en `us-east-2`
  (`https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com`), se verificó de extremo a extremo contra el
  JWT authorizer real de API Gateway: **T02** (sin token) y **T11** con un token de firma alterada y con
  un token malformado devuelven 401 nativo del authorizer, antes de invocar el Lambda — evidencia en
  `evidence/t02-t11-fase2/`. Queda pendiente únicamente la variante de T11 con un ID token real emitido
  por Cognito (requiere un login genuino de un usuario de prueba, disponible a partir de la Fase 3+).
