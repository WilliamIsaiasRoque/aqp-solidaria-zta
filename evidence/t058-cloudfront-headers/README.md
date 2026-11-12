# Evidencia T058 — Cabeceras de seguridad de CloudFront (RNF-HU-11, CA-NF11.2)

**Fecha**: 2026-11-12
**Comando**: `curl -sS -i https://d3if5n1ucewbp.cloudfront.net/`
**Archivo**: [`response.txt`](./response.txt)

## Resultado

```
HTTP/2 403
referrer-policy: same-origin
content-security-policy: default-src 'self'; connect-src 'self' https://cognito-idp.us-east-2.amazonaws.com https://*.amazoncognito.com; img-src 'self' data:; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'
x-content-type-options: nosniff
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

| Cabecera exigida (T022, CA-NF11.2) | Presente | Valor |
|---|:---:|---|
| Content-Security-Policy | ✅ | restrictiva: `default-src 'self'`, sin `unsafe-inline`/`unsafe-eval`, `connect-src` limitado a Cognito, `frame-ancestors 'none'` |
| Strict-Transport-Security (HSTS) | ✅ | `max-age=63072000; includeSubDomains; preload` |
| X-Content-Type-Options | ✅ | `nosniff` |
| Referrer-Policy | ✅ | `same-origin` |

## Nota sobre el 403

El `403 Access Denied` es esperado y **no invalida esta evidencia**: el bucket S3 de origen aún no
tiene ningún archivo (`index.html`) subido — el frontend React todavía no se compiló ni se
desplegó (eso corresponde a fases posteriores, cuando se ensamble el app shell). La
`ResponseHeadersPolicy` de CloudFront se aplica a **toda** respuesta de la distribución,
incluido este error de origen, por lo que las cuatro cabeceras de seguridad configuradas en
`infra/template.yaml` (recurso `SecurityHeadersPolicy`, T022) ya están activas en el stage
desplegado, independientemente de que el contenido del sitio todavía no exista.

## Trazabilidad

RNF-HU-11, CA-NF11.2; T022 (infra/template.yaml, Fase 2).
