# T051/T057 — MFA obligatorio para GESTOR/AUDITOR

**Actualizado**: 2026-11-12 — el bloqueo ya está **implementado** (Lambda trigger
`PreAuthentication`). Lo que sigue pendiente es la verificación contra un login real desplegado.

## Qué se implementó (T057)

`backend/src/authz/mfaEnforcement.ts` es un Lambda trigger `PreAuthentication` de Cognito,
conectado en `infra/template.yaml` (`UserPool.LambdaConfig.PreAuthentication`). En cada intento de
inicio de sesión, Cognito lo invoca **antes** de validar la contraseña:

1. Consulta `AdminListGroupsForUser` para los grupos del usuario.
2. Si el usuario es `GESTOR` o `AUDITOR`, consulta `AdminGetUser` (`UserMFASettingList`).
3. Si `SOFTWARE_TOKEN_MFA` no está en esa lista, lanza un `Error`.

Un error lanzado por cualquier trigger de Cognito **aborta todo el flujo de autenticación**: el
cliente no recibe tokens. Esto es exactamente T14/CA-11.2 ("no obtiene tokens"), y no requiere que
un administrador enrole manualmente MFA a cada usuario nuevo del grupo — el bloqueo es automático
para cualquier `GESTOR`/`AUDITOR` sin TOTP configurado.

## Qué se verificó (T051, prueba local)

`backend/test/integration/mfaEnforcement.test.ts` (rojo→verde) prueba la lógica del trigger con un
`CognitoAdminClient` en memoria que implementa el mismo contrato que las llamadas reales a
`AdminListGroupsForUser`/`AdminGetUser`:

| Caso | Resultado esperado | ¿Pasa? |
|---|---|---|
| GESTOR sin `SOFTWARE_TOKEN_MFA` | el handler lanza error (bloquea el login) | ✅ |
| GESTOR con `SOFTWARE_TOKEN_MFA` | el handler permite continuar | ✅ |
| AUDITOR sin MFA | el handler lanza error | ✅ |
| DONANTE sin MFA | el handler permite continuar (MFA opcional) | ✅ |
| Usuario sin ningún grupo | el handler permite continuar | ✅ |

## Qué sigue pendiente (verificación real)

Esta prueba ejercita la lógica del trigger, no una invocación real de Cognito. Para verificar
contra el stage desplegado (y cerrar del todo T051/T14) haría falta, con credenciales de AWS:

1. `sam deploy` con la plantilla actualizada (conecta el trigger al User Pool real).
2. Crear un usuario de prueba en el grupo `GESTOR` **sin** configurar MFA.
3. Intentar `InitiateAuth`/login contra el Hosted UI y confirmar que Cognito devuelve un error
   (p. ej. `UserLambdaValidationException`) y no emite tokens.
4. Repetir enrolando TOTP y marcándolo preferido, y confirmar que el login SÍ completa (tras
   superar el desafío MFA).

`aws sts get-caller-identity` sigue fallando con `NoCredentials` en esta sesión, por lo que estos
cuatro pasos no se ejecutaron. `sam validate --lint` y `sam build` sí se ejecutaron en verde sobre
la plantilla actualizada.

## Trazabilidad

HU-11, CA-11.1, CA-11.2, T14. `docs/threat-model.md` (sección "Limitaciones conocidas", entrada
"MFA por grupo").
