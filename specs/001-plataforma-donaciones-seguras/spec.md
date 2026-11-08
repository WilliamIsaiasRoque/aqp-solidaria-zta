# Feature Specification: Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA

**Feature Branch**: `001-plataforma-donaciones-seguras`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Lee completos requirements.md y design.md en la raíz del repo. Especifica el
sistema completo "Plataforma de Donaciones Seguras" como una sola especificación, transcribiendo fielmente
sus historias (HU), criterios (CA), requisitos no funcionales (RNF-HU) y casos de prueba (T0x). Conserva
exactos esos identificadores, no los renumeres ni inventes nuevos."

**Trazabilidad**: todos los identificadores `HU-xx`, `CA-xx`, `RNF-HU-xx`, `CA-NFxx.x` y `T0x` de esta
especificación se transcriben exactos desde [requirements.md](../../requirements.md) y
[design.md](../../design.md), conforme al principio de trazabilidad fijado en
[constitution.md](../../.specify/memory/constitution.md).

## Contexto y alcance

Una fundación peruana ficticia, «Fundación AQP-SOLIDARIA», administra proyectos sociales (educación,
alimentación y salud comunitaria) y necesita publicar sus campañas y recibir **intenciones de donación**
verificables y auditables. La evaluación académica usa **donaciones simuladas, no fondos reales**: está
prohibido solicitar o almacenar números de tarjeta, CVV, credenciales bancarias o realizar cargos reales.

**Fuera de alcance declarado**: integración de pago real, conciliación financiera, comprobantes
tributarios y verificación legal de una fundación; verificación de postura del dispositivo, evaluación
continua de riesgo de sesión, ZTNA (AWS Verified Access) y detección gestionada (GuardDuty/Security Hub),
por no estar disponibles en el AWS Free plan.

**Roles y matriz de permisos** (representados como grupos de Cognito `DONANTE`, `GESTOR`, `AUDITOR`, leídos
del claim `cognito:groups` del access token; los permisos se verifican siempre en backend):

| Función | Visitante | Donante | Gestor | Auditor |
|---|:---:|:---:|:---:|:---:|
| Ver proyectos publicados y totales agregados | Sí | Sí | Sí | Sí |
| Crear intención de donación simulada | No | Sí | No | No |
| Simular confirmación de donación propia (solo stage académico) | No | Sí | No | No |
| Ver historial propio | No | Sí | No | No |
| Crear/editar/publicar proyectos | No | No | Sí | No |
| Consultar eventos de auditoría | No | No | No | Sí |
| **MFA obligatorio** | — | Opcional | **Sí** | **Sí** |

## User Scenarios & Testing *(mandatory)*

Prioridad: **MVP** = obligatorio para la nota máxima; **Extensión** = puntos adicionales, no necesaria
para nota máxima. Cada historia conserva su identificador `HU-xx` original; cada criterio de aceptación
conserva su identificador `CA-xx.x` original.

### EP-01. Descubrimiento de proyectos

#### HU-01 — Listar proyectos (MVP) (Priority: P1)

Como visitante quiero explorar proyectos sociales abiertos para elegir una causa.

**Why this priority**: es el punto de entrada de todo visitante y condición previa para cualquier
donación; sin catálogo no hay producto demostrable.

**Independent Test**: puede probarse de forma independiente llamando `GET /v1/projects` sin autenticación
y verificando que solo se listan proyectos PUBLICADO con sus montos confirmados.

**Acceptance Scenarios**:

1. **CA-01.1**: **Given** existen proyectos en estado PUBLICADO, **When** un visitante accede al catálogo,
   **Then** se muestran nombre, finalidad, meta en PEN y suma **confirmada simulada** de cada proyecto.
2. **CA-01.2**: **Given** un proyecto está en estado BORRADOR, **When** un visitante accede al catálogo
   público, **Then** ese proyecto no aparece en el listado.
3. **CA-01.3**: **Given** no hay proyectos publicados, **When** un visitante accede al catálogo, **Then**
   se presenta un estado vacío comprensible sin errores técnicos.

---

#### HU-02 — Consultar detalle (MVP) (Priority: P1)

Como visitante quiero conocer el detalle y progreso de un proyecto antes de donar.

**Why this priority**: es el paso previo indispensable a HU-05 (registrar una donación); sin detalle
verificable, el donante no puede decidir informadamente.

**Independent Test**: puede probarse llamando `GET /v1/projects/{projectId}` con un identificador válido
publicado y con uno inexistente o no publicado.

**Acceptance Scenarios**:

1. **CA-02.1**: **Given** un proyecto publicado existente, **When** un visitante consulta su detalle,
   **Then** se visualiza identificador, descripción, objetivo, estado y monto acumulado, sin datos
   personales de donantes.
2. **CA-02.2**: **Given** un identificador inexistente o un proyecto no publicado, **When** un visitante
   consulta ese detalle, **Then** el sistema devuelve HTTP 404 al visitante, sin revelar contenido.

---

### EP-02. Identidad y acceso

#### HU-03 — Iniciar y cerrar sesión (MVP) (Priority: P1)

Como donante quiero autenticarme para que mis acciones tengan una identidad verificable.

**Why this priority**: es la base de Zero Trust (ninguna solicitud se confía sin autenticación) y
condición previa de toda acción de donante (HU-05, HU-06, HU-07).

**Independent Test**: puede probarse ejecutando el flujo de inicio de sesión de Amazon Cognito de forma
aislada y verificando el formato y vigencia de los tokens emitidos, sin depender de otra historia.

**Acceptance Scenarios**:

1. **CA-03.1**: **Given** un donante inicia sesión, **When** usa el flujo de autenticación, **Then** este
   usa Amazon Cognito (managed login u hosted UI) con **Authorization Code + PKCE obligatorio**; no se usa
   el flujo implícito.
2. **CA-03.2**: **Given** una ruta protegida, **When** se accede sin token, con token expirado, alterado,
   de otro app client, o con un **ID token** en lugar de access token, **Then** el sistema devuelve HTTP
   401.
3. **CA-03.3**: **Given** un donante autenticado, **When** se emite su access token, **Then** este tiene
   una vigencia **≤ 15 minutos** (mínimo de Cognito: 5 min); **When** el donante cierra sesión, **Then** la
   SPA elimina los tokens de memoria y revoca el refresh token (`/oauth2/revoke` o `RevokeToken`).
4. **CA-03.4**: **Given** el JWT authorizer de API Gateway valida firma y expiración localmente, **When**
   un access token es revocado antes de su expiración natural, **Then** ese token sigue siendo aceptado
   hasta expirar; esta limitación se documenta y demuestra, y la ventana de exposición queda acotada por
   CA-03.3.

---

#### HU-04 — Control de roles (MVP) (Priority: P1)

Como responsable de la fundación quiero que solo las personas autorizadas realicen operaciones sensibles.

**Why this priority**: sin control de roles verificado en backend, cualquier donante podría crear
proyectos o leer historiales ajenos, invalidando el modelo Zero Trust completo.

**Independent Test**: puede probarse con un usuario del grupo `DONANTE` intentando ejecutar operaciones
reservadas a `GESTOR`, y con un `GESTOR` intentando leer el historial privado de un `DONANTE`.

**Acceptance Scenarios**:

1. **CA-04.1**: **Given** un usuario autenticado como donante, **When** intenta crear, modificar o
   publicar un proyecto, **Then** el API responde HTTP 403.
2. **CA-04.2**: **Given** un usuario autenticado como gestor, **When** intenta consultar el historial
   privado de un donante, **Then** el API responde HTTP 403 o 404 sin filtrar información.
3. **CA-04.3**: **Given** cualquier solicitud protegida, **When** el backend determina identidad y roles,
   **Then** obtiene `sub` y `cognito:groups` exclusivamente de claims verificados del token, nunca de
   campos enviados por el cliente.

---

#### HU-11 — MFA para roles privilegiados (MVP) (Priority: P1)

Como responsable de seguridad quiero un segundo factor para cuentas con privilegios.

**Why this priority**: las cuentas GESTOR y AUDITOR concentran operaciones sensibles (publicar proyectos,
leer auditoría); su compromiso por robo de credenciales de un solo factor tiene el mayor impacto posible
en el sistema.

**Independent Test**: puede probarse intentando iniciar sesión como GESTOR sin completar el segundo
factor y verificando que no se emiten tokens.

**Acceptance Scenarios**:

1. **CA-11.1**: **Given** un usuario de los grupos GESTOR o AUDITOR, **When** se configura su cuenta,
   **Then** tiene MFA TOTP (app autenticadora) habilitado; no se usa MFA por SMS.
2. **CA-11.2**: **Given** un usuario GESTOR sin completar el segundo factor, **When** intenta iniciar
   sesión, **Then** no completa el inicio de sesión y no obtiene tokens (evidenciado con captura o prueba).

---

### EP-03. Donaciones simuladas

#### HU-05 — Registrar intención de donación (MVP) (Priority: P1)

Como donante autenticado quiero registrar un monto destinado a un proyecto para seguir mi aporte de
prueba.

**Why this priority**: es la acción central del producto; sin ella no existe "donación" que simular,
confirmar o listar en un historial.

**Independent Test**: puede probarse enviando `POST /v1/donations` con distintos montos, claves de
idempotencia y estados de proyecto, de forma aislada de la simulación de confirmación (HU-06).

**Acceptance Scenarios**:

1. **CA-05.1**: **Given** un proyecto en estado PUBLICADO, un importe válido en PEN (mínimo S/ 1.00,
   máximo S/ 1,000.00, máximo dos decimales; enviado como `amountCents` entero entre 100 y 100000) y una
   cabecera `Idempotency-Key` (UUID), **When** el donante registra la intención, **Then** se crea un
   registro en estado `PENDIENTE_SIMULACION` y el sistema responde HTTP 201.
2. **CA-05.2**: **Given** un monto cero, negativo, no entero o fuera de los límites, o la ausencia de
   `Idempotency-Key`, **When** se intenta registrar la intención, **Then** el sistema responde HTTP 400;
   **Given** un proyecto inexistente, **Then** responde HTTP 404; **Given** un proyecto no PUBLICADO,
   **Then** responde HTTP 409; en ningún caso se modifica el acumulado del proyecto.
3. **CA-05.3**: **Given** cualquier solicitud de registro, **When** se determina el propietario de la
   donación, **Then** el `donorSub` se obtiene de la identidad autenticada, nunca del cuerpo de la
   solicitud.
4. **CA-05.4**: **Given** una `Idempotency-Key` ya usada, **When** se reenvía con la misma carga,
   **Then** el sistema devuelve el mismo resultado sin crear otra donación; **When** se reutiliza con una
   carga distinta, **Then** devuelve HTTP 409; el registro de la clave y la donación se escriben de forma
   atómica.
5. **CA-05.5**: **Given** cualquier solicitud de registro de donación, **Then** el sistema no solicita
   datos de tarjeta, CVV, cuenta bancaria, DNI ni datos de pago reales.

---

#### HU-06 — Simular confirmación (MVP) (Priority: P1)

Como donante quiero comprobar el resultado de mi contribución en un flujo de prueba.

**Why this priority**: completa el ciclo de vida de la donación simulada y es la historia donde se
demuestra la integridad transaccional (idempotencia y concurrencia) exigida por RNF-HU-04.

**Independent Test**: puede probarse enviando solicitudes de simulación — incluyendo 10 solicitudes
concurrentes— sobre una donación propia en estado `PENDIENTE_SIMULACION` creada previamente por HU-05.

**Acceptance Scenarios**:

1. **CA-06.1**: **Given** una donación propia en estado `PENDIENTE_SIMULACION`, **When** el donante
   invoca el endpoint de simulación, **Then** esta pasa a `CONFIRMADA_SIMULADA` o `RECHAZADA_SIMULADA`;
   este endpoint **solo se despliega en el stage académico** (condición en la plantilla SAM) y en otro
   stage la ruta no existe.
2. **CA-06.2**: **Given** una donación con múltiples solicitudes de transición repetidas o concurrentes,
   **When** se procesan, **Then** solo la primera transición válida modifica el monto confirmado; las
   demás no alteran el total y una transición inválida responde HTTP 409.
3. **CA-06.3**: **Given** una donación que resulta `RECHAZADA_SIMULADA`, **Then** no incrementa las
   cifras agregadas del proyecto.
4. **CA-06.4**: **Given** cualquier resultado de simulación, **Then** la interfaz muestra «Simulación
   académica: no se ha realizado ningún cobro».

---

#### HU-07 — Ver historial propio (MVP) (Priority: P2)

Como donante quiero consultar mis donaciones simuladas para verificar su estado.

**Why this priority**: es una historia de transparencia individual que depende de que ya existan
donaciones (HU-05/HU-06); no bloquea la demostración del flujo principal de donación, pero es necesaria
para la prueba BOLA (T09) y para RNF-HU-02.

**Independent Test**: puede probarse autenticando a dos donantes distintos y verificando que cada uno solo
ve sus propios registros al llamar `GET /v1/donations/me`.

**Acceptance Scenarios**:

1. **CA-07.1**: **Given** un donante autenticado, **When** consulta su historial, **Then** se muestran
   solo registros del `sub` autenticado, con fecha, importe, proyecto y estado.
2. **CA-07.2**: **Given** una donación perteneciente a otro usuario, **When** un donante intenta
   consultarla, **Then** el sistema devuelve HTTP 403 o 404 sin revelar datos (prueba BOLA).

---

### EP-04. Gestión y transparencia

#### HU-08 — Gestionar proyectos (MVP) (Priority: P1)

Como gestor quiero registrar y publicar proyectos para habilitar donaciones simuladas.

**Why this priority**: sin proyectos creados y publicados por un gestor no existe contenido para HU-01,
HU-02 ni HU-05; es condición previa de todo el flujo de donación.

**Independent Test**: puede probarse con un usuario GESTOR creando un proyecto en BORRADOR y luego
publicándolo, de forma aislada del resto de historias.

**Acceptance Scenarios**:

1. **CA-08.1**: **Given** un usuario del grupo GESTOR, **When** crea un proyecto con título, descripción,
   objetivo PEN positivo, **Then** este se crea en estado BORRADOR; ningún otro rol puede crearlo.
2. **CA-08.2**: **Given** un proyecto válido, **When** un GESTOR lo publica, **Then** el proyecto pasa a
   aceptar donaciones; un BORRADOR no acepta donaciones; publicar un proyecto ya publicado devuelve HTTP
   409.
3. **CA-08.3**: **Given** cualquier creación o publicación de proyecto, **Then** se registra un evento de
   auditoría con actor, fecha, acción y resultado.

---

#### HU-09 — Indicadores agregados (MVP) (Priority: P2)

Como visitante quiero conocer los montos confirmados para comprender el avance de cada campaña.

**Why this priority**: refuerza la transparencia del catálogo (HU-01/HU-02) pero depende de que existan
donaciones confirmadas (HU-06); es complementaria, no bloqueante del flujo principal.

**Independent Test**: puede probarse verificando que la suma mostrada excluye donaciones pendientes y
rechazadas y que ningún identificador de donante se expone.

**Acceptance Scenarios**:

1. **CA-09.1**: **Given** donaciones en distintos estados para un proyecto, **When** se calcula el
   indicador agregado, **Then** la suma excluye pendientes y rechazadas, y los montos se muestran en
   formato PEN.
2. **CA-09.2**: **Given** la vista pública de un proyecto, **Then** no se expone identificadores de
   donantes ni registros individuales.

---

#### HU-10 — Consultar auditoría (Extensión) (Priority: P3)

Como auditor quiero consultar acciones críticas para investigar desviaciones.

**Why this priority**: es una extensión que otorga puntuación adicional, no requerida para el MVP;
depende de que ya existan eventos de auditoría generados por HU-08, HU-05, HU-06.

**Independent Test**: puede probarse con un usuario del grupo AUDITOR autenticado con MFA, consultando
eventos filtrados por tipo y fecha, de forma aislada de la generación de dichos eventos.

**Acceptance Scenarios**:

1. **CA-10.1**: **Given** un usuario del grupo AUDITOR con MFA, **When** consulta eventos de auditoría,
   **Then** obtiene resultados con filtros por tipo y fecha; ningún otro rol puede acceder.
2. **CA-10.2**: **Given** cualquier evento de auditoría consultado, **Then** incluye `timestamp`,
   `requestId`, actor seudonimizado, recurso, acción y resultado; nunca tokens, claves ni datos
   financieros.

---

#### HU-12 — Autorización externalizada (Extensión) (Priority: P3)

Como arquitecto quiero separar la decisión de autorización del código de negocio, alineado con el Policy
Engine de NIST.

**Why this priority**: es una extensión arquitectónica que otorga puntuación adicional; requiere que las
reglas de autorización de HU-04, HU-07 y HU-08 ya existan y tengan pruebas (T03, T09, T12) para poder
comparar el motor embebido contra el externo.

**Independent Test**: puede probarse re-ejecutando las pruebas T03, T09 y T12 contra el motor de
autorización externo y comparando resultados con el motor embebido del MVP.

**Acceptance Scenarios**:

1. **CA-12.1**: **Given** las reglas de autorización de HU-04, HU-07 y HU-08, **When** se externalizan,
   **Then** se expresan en Cedar y se evalúan con Amazon Verified Permissions (`IsAuthorized`) desde
   Lambda.
2. **CA-12.2**: **Given** el motor de autorización externo configurado, **When** se ejecutan las pruebas
   T03, T09 y T12, **Then** pasan igual que con la autorización embebida; el informe compara ambos
   enfoques.

---

### Edge Cases

- ¿Qué ocurre si se solicita el detalle de un proyecto con un identificador que nunca existió frente a uno
  que existió pero está en BORRADOR? Ambos casos devuelven HTTP 404 sin distinguir la causa al visitante
  (CA-02.2).
- ¿Cómo maneja el sistema un access token válido pero revocado antes de su expiración natural? Se acepta
  hasta que expira de forma natural; la limitación se documenta (CA-03.4, T13).
- ¿Qué ocurre si 10 solicitudes de confirmación llegan simultáneamente para la misma donación? Solo la
  primera transición válida se contabiliza; el resto no altera el total (CA-06.2, CA-NF04.1, T08).
- ¿Qué ocurre si se reenvía una `Idempotency-Key` con un cuerpo distinto al original? El sistema responde
  HTTP 409 sin crear ni modificar ninguna donación (CA-05.4, T07).
- ¿Qué ocurre si un gestor intenta publicar un proyecto que ya está PUBLICADO? El sistema responde HTTP
  409 (CA-08.2).
- ¿Qué ocurre si un donante intenta ejecutar la simulación de confirmación sobre una donación que no es
  suya? El endpoint exige propiedad del recurso; se rechaza (CA-06.1, principio de ownership de HU-04).
- ¿Qué ocurre si un usuario GESTOR no completa el segundo factor de autenticación? No obtiene tokens y no
  inicia sesión (CA-11.2, T14).

## Requirements *(mandatory)*

### Functional Requirements

Los requisitos funcionales de esta especificación son las historias **HU-01 a HU-12** descritas arriba,
con sus criterios de aceptación **CA-xx.x**, que se conservan como identificadores canónicos de
trazabilidad (no se renumeran como `FR-00x`, conforme a la instrucción explícita de preservar los
identificadores originales). Los requisitos no funcionales de esta especificación son:

- **RNF-HU-01 — Confidencialidad en tránsito (MVP)**: Como responsable de seguridad quiero que todas las
  comunicaciones usen HTTPS.
  - **CA-NF01.1**: el frontend (CloudFront) y el API (API Gateway) usan TLS; no hay interfaz servida por
    HTTP.
  - **CA-NF01.2**: no aparecen secretos, JWT ni datos personales en logs ni en el repositorio GitHub.

- **RNF-HU-02 — Zero Trust e identidad (MVP)**: Como responsable de seguridad quiero que cada solicitud
  protegida sea autenticada y autorizada sin confianza implícita.
  - **CA-NF02.1**: el JWT authorizer valida emisor (user pool), firma, expiración y `client_id` (los
    access tokens de Cognito no incluyen `aud`); las rutas protegidas exigen scopes, de modo que un ID
    token no sirve como credencial.
  - **CA-NF02.2**: el backend valida rol, propietario del recurso y reglas de negocio en cada solicitud;
    no se confía en roles, montos ni IDs enviados por el navegador.
  - **CA-NF02.3**: el informe incluye la tabla de mapeo de controles a los 7 principios de NIST SP
    800-207 y a los componentes PE/PA/PEP.

- **RNF-HU-03 — Mínimo privilegio (MVP)**: Como administrador cloud quiero reducir el impacto de una
  función comprometida.
  - **CA-NF03.1**: cada función de cómputo tiene su propio rol con solo las acciones de persistencia y
    tablas que necesita (por ejemplo, la función de listado no puede escribir).
  - **CA-NF03.2**: no hay credenciales AWS persistentes en código ni en CI; no hay `Action: "*"` ni
    `Resource: "*"` injustificados.
  - **CA-NF03.3**: ningún integrante usa el usuario root para trabajar; cada uno tiene un usuario IAM con
    MFA y sin llaves de acceso de larga duración.

- **RNF-HU-04 — Integridad e idempotencia (MVP)**: Como responsable financiero quiero evitar aportes
  duplicados y saldos incorrectos.
  - **CA-NF04.1**: un mismo evento de confirmación no se contabiliza dos veces, incluso ante solicitudes
    concurrentes (se demuestra con al menos 10 solicitudes paralelas).
  - **CA-NF04.2**: transiciones y acumulado se actualizan de forma atómica y condicionada; se documenta
    la decisión.

- **RNF-HU-05 — Rendimiento (MVP)**: Como donante quiero que la consulta de proyectos sea fluida.
  - **CA-NF05.1**: con 50 proyectos, el 95% de respuestas de lectura del backend (excluyendo cold start)
    completa en ≤ 1.5 s desde un cliente cercano a la región.
  - **CA-NF05.2**: se registran método, herramienta y condiciones de medición.

- **RNF-HU-06 — Accesibilidad y usabilidad (MVP)**: Como visitante quiero usar el sistema desde móvil y
  teclado.
  - **CA-NF06.1**: catálogo, detalle, donación y confirmación son usables a 375 px de ancho.
  - **CA-NF06.2**: formularios con etiquetas, mensajes accesibles y foco visible; se evalúan criterios
    WCAG 2.2 AA aplicables.

- **RNF-HU-07 — Observabilidad y trazabilidad (MVP)**: Como auditor técnico quiero reconstruir resultados
  sin exponer secretos.
  - **CA-NF07.1**: logs estructurados con `requestId`, acción, resultado, código HTTP y duración;
    retención de logs ≤ 14 días.
  - **CA-NF07.2**: se muestran al menos un caso exitoso y uno rechazado (401/403); un registro de
    auditoría de infraestructura evidencia los cambios.

- **RNF-HU-08 — Calidad y mantenibilidad (MVP)**: Como equipo quiero un producto verificable y
  reproducible.
  - **CA-NF08.1**: pruebas automáticas de validaciones, autorización, idempotencia y transiciones; CI
    ejecuta lint, typecheck, tests y build en cada PR.
  - **CA-NF08.2**: infraestructura como código reproducible; README con despliegue y eliminación de
    recursos.

- **RNF-HU-09 — Presupuesto y cuenta (MVP)**: Como estudiante quiero evitar cargos inesperados.
  - **CA-NF09.1**: la cuenta es AWS Free plan; se usa una sola región; se configura una alerta de
    presupuesto; antes de desplegar se verifica que cada servicio esté en la lista del Free plan.
  - **CA-NF09.2**: al cierre se ejecuta el procedimiento de limpieza y se verifica que no queden
    recursos.

- **RNF-HU-10 — Protección de datos (MVP)**: Como titular de datos quiero que se minimice su tratamiento.
  - **CA-NF10.1**: solo identidades y proyectos de prueba; solo atributos imprescindibles (correo de
    prueba y `sub`).
  - **CA-NF10.2**: la aplicación informa que es prototipo académico; un despliegue real exigiría
    evaluación legal peruana (Ley N.º 29733), privacidad y retención.

- **RNF-HU-11 — Seguridad del navegador (MVP)**: Como responsable de seguridad quiero reducir el impacto
  de un XSS.
  - **CA-NF11.1**: los tokens se mantienen en memoria (no en almacenamiento persistente del navegador);
    cualquier alternativa se justifica en el informe.
  - **CA-NF11.2**: el frontend se entrega con cabeceras de seguridad (CSP restrictiva, HSTS,
    `X-Content-Type-Options`, `Referrer-Policy`).

### Key Entities *(include if feature involves data)*

- **Project**: representa una campaña social publicable por un gestor. Atributos: `projectId`, `title`,
  `description`, `goalAmountCents`, `confirmedAmountCents`, `currency` (PEN), `status` (`BORRADOR`,
  `PUBLICADO`), `createdAt`, `updatedAt`. Invariante: el monto se representa en centavos enteros.
- **Donation**: representa la intención de aporte simulado de un donante a un proyecto. Atributos:
  `donationId`, `projectId`, `donorSub`, `amountCents`, `currency` (PEN), `status`
  (`PENDIENTE_SIMULACION`, `CONFIRMADA_SIMULADA`, `RECHAZADA_SIMULADA`), `createdAt`, `updatedAt`.
  Invariante: solo transiciona de pendiente a un estado terminal, una sola vez.
- **IdempotencyRecord**: registro que impide que una misma solicitud de creación de donación se procese
  dos veces. Atributos: clave compuesta por donante, operación y clave de idempotencia; `payloadHash`,
  `donationId`, `responseStatus`, `expiresAt`. Invariante: una clave de idempotencia por usuario y
  operación.
- **AuditEvent**: representa un evento crítico registrado para su posterior revisión por un auditor.
  Atributos: `eventId`, `timestamp`, `requestId`, `actorRef` (seudónimo), `action`, `resourceRef`,
  `outcome`. Invariante: nunca contiene tokens, claves ni datos financieros.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante puede ver el catálogo de proyectos publicados y su progreso agregado sin
  autenticarse, en condiciones normales de red (deriva de HU-01, HU-02, HU-09).
- **SC-002**: Un donante autenticado puede registrar una intención de donación válida y recibir
  confirmación de su creación sin que se le solicite ningún dato de pago real (deriva de HU-05, CA-05.5).
- **SC-003**: Reenviar la misma solicitud de creación de donación con la misma clave de idempotencia
  produce siempre el mismo resultado, sin generar un segundo registro, el 100% de las veces, incluso bajo
  concurrencia (deriva de CA-05.4, RNF-HU-04).
- **SC-004**: El 95% de las consultas de catálogo con 50 proyectos cargados responde en 1.5 segundos o
  menos desde una ubicación cercana a la región de despliegue (deriva de RNF-HU-05).
- **SC-005**: Ninguna operación sensible (crear/publicar proyectos, leer historial ajeno, leer auditoría)
  es accesible por un rol no autorizado; toda solicitud sin autorización suficiente es rechazada con un
  código de error explícito y sin filtrar datos (deriva de HU-04, HU-07, HU-10, RNF-HU-02).
- **SC-006**: Las cuentas con privilegios (gestor, auditor) no pueden iniciar sesión sin completar un
  segundo factor de autenticación, el 100% de las veces (deriva de HU-11).
- **SC-007**: Las pantallas de catálogo, detalle, donación y confirmación son utilizables en un ancho de
  pantalla de 375 px y mediante navegación por teclado (deriva de RNF-HU-06).
- **SC-008**: Todo evento crítico del sistema (creación/publicación de proyecto, creación/confirmación de
  donación) queda registrado de forma reconstruible por un auditor, sin exponer secretos ni datos
  financieros (deriva de HU-08, HU-10, RNF-HU-07).

## Casos de prueba de aceptación (T01–T14)

Esta tabla se transcribe exacta de requirements.md §6 y constituye el conjunto mínimo de pruebas de
aceptación que validan las historias y requisitos no funcionales anteriores. Los identificadores `T0x` se
conservan exactos para su uso en planificación, tareas e informe técnico.

| ID | Escenario | Esperado | Trazabilidad |
|---|---|---|---|
| T01 | Visitante consulta proyectos | 200, sin borradores | CA-01.1, CA-01.2 |
| T02 | Sin token intenta donar | 401 | CA-03.2 |
| T03 | Donante intenta crear proyecto | 403 | CA-04.1 |
| T04 | Donante envía 0, 100001 o valor no entero | 400 | CA-05.2 |
| T05 | Donante crea intención válida | 201, pendiente, sin cargo | CA-05.1 |
| T06 | Repite clave y payload idénticos | Mismo resultado, una sola donación | CA-05.4 |
| T07 | Repite clave con payload distinto | 409 | CA-05.4 |
| T08 | 10 confirmaciones concurrentes de la misma donación | Un solo incremento | CA-06.2, CA-NF04.1 |
| T09 | Donante consulta donación ajena | 403/404 sin filtración | CA-07.2 |
| T10 | Función de listado intenta escribir en la base de datos (prueba controlada o simulador de políticas IAM) | Acceso denegado y error controlado | CA-NF03.1 |
| T11 | Usa un ID token o token alterado como Bearer | 401 | CA-03.2, CA-NF02.1 |
| T12 | Gestor consulta historial de un donante | 403/404 | CA-04.2 |
| T13 | Token revocado usado antes de expirar | Aceptado hasta expirar (limitación documentada); rechazado después | CA-03.4 |
| T14 | Usuario GESTOR inicia sesión sin segundo factor | No obtiene tokens | CA-11.2 |

## Assumptions

- Los usuarios y proyectos utilizados en la evaluación son ficticios; no existen fondos, cuentas
  bancarias ni personas reales involucradas (requirements.md §1).
- El modelo de seguridad Zero Trust (NIST SP 800-207) aplica de forma íntegra, salvo las limitaciones
  explícitamente declaradas como fuera de alcance por restricciones del AWS Free plan (verificación de
  postura del dispositivo, evaluación continua de riesgo de sesión, ZTNA y detección gestionada).
- Se admite simplificar la interfaz de usuario, pero no se admite eliminar ningún control de seguridad
  descrito en esta especificación (requirements.md §5).
- La prioridad **MVP** (HU-01 a HU-09, HU-11 y RNF-HU-01 a RNF-HU-11) es obligatoria para la nota máxima;
  **Extensión** (HU-10, HU-12) otorga puntuación adicional sin ser requisito de aprobación.
- El criterio de terminado ("Definition of Done") incluye: demo con usuarios de prueba de los cuatro
  roles; pruebas T01–T14 ejecutadas con evidencia; logs sin secretos; documentación de despliegue,
  limpieza y restricciones de cuenta; revisión por pares en GitHub con CI en verde; tabla de mapeo NIST;
  declaración de uso de IA; y eliminación de los recursos de infraestructura tras la evaluación
  (requirements.md §5).
