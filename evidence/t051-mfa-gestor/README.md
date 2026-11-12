# T051 — Bloqueado: requiere credenciales AWS/Cognito que este agente no tiene

**Estado**: no ejecutado. No se marca `[X]` en `tasks.md`.

## Por qué T051 no se pudo completar en esta sesión

T051 pide **T14** (requirements.md §6): "usuario GESTOR inicia sesión sin segundo factor → no
obtiene tokens", con evidencia (captura o prueba) en `evidence/`.

A diferencia de T049/T050 (lógica propia de este backend, verificable con tests unitarios), T14
depende enteramente del comportamiento de **Amazon Cognito** durante un inicio de sesión real:

- No hay ningún código propio del repositorio que implemente o intercepte el flujo de login — la
  SPA solo configura `oidc-client-ts` para redirigir al Hosted UI de Cognito (`frontend/src/auth/
  oidc.ts`); la decisión de exigir o no el segundo factor la toma Cognito, no este código.
- Para producir evidencia real haría falta: (1) crear un usuario de prueba en el grupo `GESTOR`,
  (2) configurarle (o no) un dispositivo TOTP, (3) ejecutar el flujo de login contra el Hosted UI
  desplegado y observar si Cognito emite tokens sin el segundo factor.
- Ninguno de esos tres pasos es posible sin credenciales de AWS: `aws sts get-caller-identity`
  falla con `NoCredentials` en esta sesión (igual que se documentó para T057 en
  `docs/threat-model.md`).

## Qué sí se puede afirmar sin ejecutar el login

Con la configuración actual de `infra/template.yaml` (`MfaConfiguration: OPTIONAL`,
`EnabledMfas: [SOFTWARE_TOKEN_MFA]`), un usuario `GESTOR` **sin un dispositivo MFA enrolado**
completaría el login con solo su contraseña — Cognito no tiene nada que desafiar. Es decir, **T14
NO pasaría todavía** contra el stage real tal como está configurado hoy: la exigencia efectiva de
MFA para `GESTOR`/`AUDITOR` requiere que, además de habilitar `SOFTWARE_TOKEN_MFA` a nivel de
pool, el equipo enrole un dispositivo TOTP a cada usuario de esos grupos y marque esa preferencia
como obligatoria (`AdminSetUserMFAPreference` con `PreferredMfa: true`), paso operativo que no se
automatizó en esta fase (ver T057, también pendiente, que evalúa automatizarlo con un Lambda
trigger).

## Cómo completarlo

Una de estas opciones, por parte del equipo (con acceso a la cuenta AWS):

1. Crear un usuario de prueba en el grupo `GESTOR`, enrolar un dispositivo TOTP y marcarlo como
   preferido (`AdminSetUserMFAPreference`). Intentar el login en el Hosted UI
   (`https://aqp-solidaria-zta-2026.auth.us-east-2.amazoncognito.com`) y detenerse antes de
   ingresar el código TOTP: confirmar que no se recibe ningún `code`/token. Documentar con una
   captura en esta carpeta.
2. Si se decide no enrolar MFA individualmente y en cambio resolver T057 primero (Lambda trigger
   que fuerce MFA por grupo), T051 se vuelve trivialmente demostrable contra cualquier `GESTOR`
   nuevo sin pasos manuales adicionales.

## Trazabilidad

HU-11, CA-11.2, T14. Relacionado: T057 (pendiente, mecanismo de enforcement por grupo).
