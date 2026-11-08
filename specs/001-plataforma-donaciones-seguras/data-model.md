# Data Model: Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

**Fuente única**: [design.md](../../design.md) §5 y [requirements.md](../../requirements.md) §4
(transcrito tal cual; sin campos ni tablas adicionales a los definidos ahí). Bloque: **[MVP]** para las
cuatro tablas; el consumo de `AuditEvents` por un endpoint de lectura es **[Extensión — HU-10]**.

## Projects — **[MVP]**

| Campo | Tipo lógico | Descripción / regla |
|---|---|---|
| `projectId` | string (PK) | Identificador del proyecto. |
| `title` | string | Título del proyecto. |
| `description` | string | Descripción del proyecto. |
| `goalAmountCents` | entero | Meta en céntimos de PEN; siempre entero, nunca `float` (design.md §5). |
| `confirmedAmountCents` | entero | Acumulado confirmado en céntimos de PEN; solo se incrementa por una transición válida (CA-06.2). |
| `currency` | string | Fijo `PEN`. |
| `status` | enum | `BORRADOR` \| `PUBLICADO` (requirements.md §4). |
| `createdAt` / `updatedAt` | timestamp | Trazabilidad temporal. |

**Índice**: GSI `status-createdAt` para el catálogo público (design.md §5).

**Invariantes**: un `BORRADOR` no aparece en el catálogo público (CA-01.2) ni acepta donaciones (CA-08.2);
publicar un proyecto ya `PUBLICADO` devuelve 409 (CA-08.2); los montos nunca se representan con `float`
(design.md §5, Principio constitucional II).

## Donations — **[MVP]**

| Campo | Tipo lógico | Descripción / regla |
|---|---|---|
| `donationId` | string (PK) | Identificador de la donación. |
| `projectId` | string | Proyecto destino; debe existir y estar `PUBLICADO` al crear (CA-05.1/CA-05.2). |
| `donorSub` | string | Propietario; se obtiene solo del contexto del authorizer, nunca del body (CA-05.3). |
| `amountCents` | entero | Entre 100 y 100000 (S/ 1.00–S/ 1,000.00), entero (CA-05.1/CA-05.2). |
| `currency` | string | Fijo `PEN`. |
| `status` | enum | `PENDIENTE_SIMULACION` \| `CONFIRMADA_SIMULADA` \| `RECHAZADA_SIMULADA` (requirements.md §4). |
| `createdAt` / `updatedAt` | timestamp | Trazabilidad temporal. |

**Índice**: GSI `donorSub-createdAt` para `GET /v1/donations/me` (design.md §5).

**Transiciones de estado** (design.md §5, §4 "Invariantes"): únicamente de `PENDIENTE_SIMULACION` a un
estado terminal (`CONFIRMADA_SIMULADA` o `RECHAZADA_SIMULADA`), una sola vez; solo la primera transición
válida modifica `confirmedAmountCents` del proyecto; una transición inválida (donación ya en estado
terminal, o de otro propietario) responde HTTP 409 (CA-06.2).

## IdempotencyRecord — **[MVP]**

| Campo | Tipo lógico | Descripción / regla |
|---|---|---|
| `pk` | string (PK) | `donorSub#createDonation#idempotencyKey` (requirements.md §4). |
| `payloadHash` | string | SHA-256 del body normalizado de la solicitud (design.md §5). |
| `donationId` | string | Donación creada por esa clave. |
| `responseStatus` | entero | Código de respuesta original, devuelto en reintentos idénticos. |
| `expiresAt` | timestamp (TTL) | 24 h (design.md §5). |

**Invariantes**: una clave de idempotencia por usuario y operación (requirements.md §4); repetir la
misma clave con el mismo `payloadHash` devuelve la respuesta almacenada sin crear otra donación
(CA-05.4); repetirla con un `payloadHash` distinto devuelve HTTP 409 (CA-05.4); la escritura del registro
de idempotencia y la donación ocurre en una sola operación atómica (`TransactWriteItems` condicionado,
AD-05, Principio constitucional IV).

## AuditEvent — **[MVP]** (tabla); su endpoint de consulta es **[Extensión — HU-10]**

| Campo | Tipo lógico | Descripción / regla |
|---|---|---|
| `eventId` | string | Identificador del evento. |
| `eventType` | string (PK) | Tipo de evento, para filtrar por tipo (HU-10). |
| `timestamp#eventId` | string (SK) | Orden cronológico y unicidad (design.md §5). |
| `requestId` | string | Correlación con logs (RNF-HU-07). |
| `actorRef` | string | Actor seudonimizado; nunca un dato personal real (CA-10.2). |
| `action` | string | Acción realizada. |
| `resourceRef` | string | Recurso afectado. |
| `outcome` | string | Resultado de la acción. |

**Invariantes**: nunca contiene tokens, claves ni datos financieros (CA-10.2); toda creación o
publicación de proyecto registra un evento con actor, fecha, acción y resultado (CA-08.3).

## Reglas transversales de consistencia (design.md §5, **[MVP]**)

- Repetir una `Idempotency-Key` con el mismo `payloadHash` devuelve la respuesta almacenada; con hash
  distinto, HTTP 409.
- Si una transacción falla por condición (`TransactionCanceledException`), el sistema responde HTTP 409
  sin efectos parciales.
- El dinero nunca se representa con `float`.
- Las lecturas que siguen a una escritura propia usan `ConsistentRead` cuando la consulta es por clave
  primaria.
