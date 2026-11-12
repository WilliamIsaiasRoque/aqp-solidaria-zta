# Evidencia local de la SPA — 12 nov 2026

## Validación ejecutada

- `npm ci`: correcto con el servidor Vite detenido (en Windows, el binario Lightning CSS queda
  bloqueado mientras el servidor está abierto).
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: correctos tras integrar la SPA.
- `npm test`: 66 pruebas en 10 archivos. Incluye rutas, callback, guardias de rol, sesión en memoria,
  estados vacíos y precisión decimal del monto.
- Navegador local: `/` y `/proyectos` abrieron; el catálogo consultó el stage `academic` mediante
  proxy Vite y mostró el estado vacío real. Diseño inspeccionado a 375 px y 1365 px.
- `mobile-375.jpg`: inicio a 375 px. `desktop-1365.jpg`: inicio a 1365 px.
  `inicio-completo.jpg`: inicio completo. `catalogo-vacio.jpg`: ruta `/proyectos`.

## Estado AWS observado

- `GET/HEAD https://d3if5n1ucewbp.cloudfront.net/`: HTTP 403, `Server: AmazonS3`.
- `OPTIONS /academic/v1/projects` con `Origin: https://d3if5n1ucewbp.cloudfront.net`:
  HTTP 404 sin `Access-Control-Allow-Origin`.
- No hay `aws` ni `sam` en PATH ni variables de sesión AWS en esta máquina. Por ello no se ejecutó
  `sam deploy`, la carga S3 ni la invalidación de CloudFront. No se probó login real ni operaciones
  por rol. Esas comprobaciones corresponden a T085 (validación en vivo), T088 y T089.

Las capturas no contienen tokens ni datos personales de usuarios.
