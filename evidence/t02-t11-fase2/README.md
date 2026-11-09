# Evidencia T02 / T11 contra el stage `academic` desplegado — Fase 2

**Fecha**: 2026-11-09 (UTC, ver cabecera `date` de cada respuesta)
**Endpoint verificado**: `GET https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com/academic/v1/_internal/authcheck`
(ruta foundational `AuthCheckFunction`, `infra/template.yaml`; stage `academic`, región `us-east-2`).
**Método**: `curl` directo contra el API Gateway HTTP API real, sin pasar por ningún código propio —
es decir, la verificación que faltaba en T023 (Fase 2), distinta de la prueba local simulada en
`backend/test/integration/auth.test.ts`.

## T02 — Sin token intenta donar → 401 (CA-03.2)

Archivo: [`T02_sin_token_response.txt`](./T02_sin_token_response.txt)

```
HTTP/2 401
www-authenticate: Bearer
{"message":"Unauthorized"}
```

**Resultado**: ✅ `401` nativo del JWT authorizer de API Gateway (PEP, design.md §6.1), sin invocar el
Lambda `authCheck`. Confirma CA-03.2 y CA-NF02.1 para el caso "sin token".

## T11 — Token alterado como Bearer → 401 (CA-03.2, CA-NF02.1)

Archivos: [`T11_token_alterado_response.txt`](./T11_token_alterado_response.txt),
[`T11_token_malformado_response.txt`](./T11_token_malformado_response.txt)

```
HTTP/2 401
www-authenticate: Bearer scope="api/system.authcheck" error="invalid_token" error_description="no "kid" provided in the JWT"
{"message":"Unauthorized"}
```

```
HTTP/2 401
www-authenticate: Bearer scope="api/system.authcheck" error="invalid_token" error_description="token contains an invalid number of segments"
{"message":"Unauthorized"}
```

**Resultado**: ✅ `401` nativo del JWT authorizer para dos variantes de token alterado/malformado
(un JWT con firma inválida sin `kid`, y una cadena que ni siquiera tiene la forma de un JWT). El
authorizer rechaza la solicitud con detalle `invalid_token` antes de invocar el Lambda, confirmando
CA-03.2 y CA-NF02.1 (un token manipulado no es una credencial válida).

**Pendiente (no cubierto por esta verificación)**: la variante de T11 "ID token en lugar de access
token" requiere un ID token real emitido por Cognito tras un login genuino (el `token_use` de un ID
token es `id`, no `access`, y el JWT authorizer de API Gateway lo rechaza por no declarar los scopes
de `AuthorizationScopes` — un ID token no lleva claims de scope). No se dispone de un usuario de
prueba con credenciales para completar ese login en este momento; queda para cuando el equipo cree
usuarios de prueba (Fase 3+) y se pueda repetir esta prueba con un ID token real. El caso "ID token"
ya está cubierto localmente (no contra el stage real) por
`backend/test/integration/auth.test.ts` ("T11 — ID token... usado como Bearer → 401").

## Resumen

| Prueba | Variante | Resultado contra el stage real | Evidencia |
|---|---|---|---|
| T02 | Sin token | 401 ✅ | `T02_sin_token_response.txt` |
| T11 | Token con firma alterada (JWT bien formado, firma inválida) | 401 ✅ | `T11_token_alterado_response.txt` |
| T11 | Token malformado (no es un JWT) | 401 ✅ | `T11_token_malformado_response.txt` |
| T11 | ID token real en vez de access token | Pendiente — requiere login real de un usuario de prueba | — |

Esta evidencia reemplaza, para el caso "sin token" y "token alterado", el caveat de T023 en
`tasks.md` que decía "la verificación contra el stage real desplegado queda pendiente".
