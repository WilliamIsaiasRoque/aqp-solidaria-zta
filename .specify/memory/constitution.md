<!--
Sync Impact Report
Version change: [NONE] (plantilla sin ratificar) → 1.0.0
Tipo de bump: MAJOR (primera ratificación; se definen todos los principios no negociables del proyecto)
Principios modificados: N/A (creación inicial, no hubo versión previa con contenido real)
Principios añadidos:
  - I. Zero Trust como modelo de seguridad (NIST SP 800-207)
  - II. Backend autoritativo
  - III. Cero datos de pago reales
  - IV. Idempotencia atómica
  - V. Mínimo privilegio
  - VI. Cuenta AWS Free plan única
  - VII. Stack tecnológico fijo
Secciones añadidas:
  - Trazabilidad de requisitos (decisión de equipo, no proviene de requirements.md/design.md)
  - Flujo de trabajo y control de cambios
  - Governance
Secciones eliminadas: ninguna (se reemplazan los placeholders genéricos del template)
Plantillas dependientes: no se modifican en este comando (fuera del alcance de /speckit-constitution); revisar en el
  próximo /speckit-plan o /speckit-tasks que referencien estos principios (p. ej. verificación de Zero Trust, idempotencia
  y mínimo privilegio en el "Constitution Check" de plan-template.md) sin necesidad de cambios inmediatos detectados.
Deferred TODOs: ninguno. RATIFICATION_DATE se fija a la fecha de creación de este documento (2026-11-08) porque no existe
  una ratificación previa registrada.
-->

# Plataforma de Donaciones Seguras — Fundación AQP-SOLIDARIA Constitution

## Core Principles

### I. Zero Trust como modelo de seguridad (NIST SP 800-207)

Zero Trust es el modelo de seguridad de todo el sistema, no un estilo de descomposición
arquitectónica ni un sustituto de la arquitectura de aplicación (AD-01). Toda solicitud a un
recurso protegido DEBE autenticarse y autorizarse por recurso, sin excepción basada en el
origen de red; no existe confianza implícita por estar dentro de una VPC, un API interno o un
cliente "de confianza". El diseño DEBE aplicar los cuatro principios declarados en
requirements.md §1: ninguna solicitud es confiable por su origen de red, cada solicitud
protegida se autentica y autoriza por recurso, privilegio mínimo en usuarios y cargas de
trabajo, y asumir brecha (limitar impacto y registrar evidencia).

El informe técnico DEBE incluir la tabla de mapeo de controles a los 7 principios de NIST SP
800-207 y a los componentes PE/PA/PEP (CA-NF02.3, design.md §6.1). Las limitaciones declaradas
por restricciones del AWS Free plan — verificación de postura del dispositivo, evaluación
continua de riesgo de sesión, ZTNA (AWS Verified Access) y detección gestionada
(GuardDuty/Security Hub) — DEBEN documentarse explícitamente como fuera de alcance, nunca
presentarse como implementadas ni ocultarse del informe. No se sustituirá Amazon Cognito por un
JWT autoemitido ni por un login ficticio presentado como Zero Trust (requirements.md §5).

**Razón:** el objetivo pedagógico central del proyecto es demostrar controles Zero Trust
mediante pruebas negativas (T01–T14); diluir este principio invalida la evaluación completa del
curso.

### II. Backend autoritativo

Los permisos, los importes y las transiciones de estado se validan únicamente en el servidor
(AD-04). El frontend (guards de React Router, botones ocultos, validaciones de formulario) existe
solo para experiencia de usuario y NUNCA constituye un control de seguridad. El backend DEBE
obtener identidad (`sub`) y roles (`cognito:groups`) exclusivamente de claims verificados del
access token, nunca de campos enviados por el cliente (CA-04.3, CA-05.3, CA-NF02.2). El dinero se
representa siempre como enteros (céntimos de PEN); está prohibido representar montos con `float`
en cualquier capa (design.md §5). Debe demostrarse, con llamadas directas al API usando tokens de
otros roles, que la UI por sí sola no implementa autorización (design.md §9).

**Razón:** un control de autorización que dependa de la UI es trivialmente evadible y contradice
Zero Trust (Principio I); los montos en coma flotante producen errores de redondeo que rompen la
integridad financiera simulada (Principio IV).

### III. Cero datos de pago reales

El sistema NUNCA solicita ni almacena números de tarjeta, CVV, credenciales bancarias, DNI u
otros datos de pago reales, y no realiza cargos reales (CA-05.5, requirements.md §1). Las
donaciones son transacciones simuladas (AD-03); toda interfaz relacionada con la confirmación de
una donación DEBE mostrar el aviso «Simulación académica: no se ha realizado ningún cobro»
(CA-06.4). El endpoint de simulación de confirmación (`POST /v1/donations/{donationId}/simulate`)
SOLO se despliega en el stage académico mediante una condición en la plantilla SAM; en cualquier
otro stage la ruta no debe existir (CA-06.1). La integración de pago real, la conciliación
financiera, los comprobantes tributarios y la verificación legal de una fundación quedan fuera de
alcance (requirements.md §1).

**Razón:** el proyecto es un prototipo académico; procesar dinero o datos de pago reales expone a
los integrantes y a terceros a riesgos legales, financieros y de PCI DSS que el curso no puede
asumir ni evaluar.

### IV. Idempotencia atómica

La reserva de una clave de idempotencia y la creación o transición de una donación se ejecutan en
una única operación atómica (`TransactWriteItems` condicionado), nunca en pasos separados que
puedan dejar efectos parciales (AD-05, CA-05.4, CA-NF04.2). Reenviar la misma `Idempotency-Key`
con la misma carga DEBE devolver el mismo resultado sin crear otra donación; reutilizarla con una
carga distinta DEBE devolver HTTP 409. Un mismo evento de confirmación no se contabiliza dos veces
incluso ante solicitudes concurrentes, lo que DEBE demostrarse con al menos 10 solicitudes
paralelas (CA-NF04.1, T08). Si una transacción falla por condición, el sistema responde 409 sin
efectos parciales (design.md §5); solo la primera transición válida modifica el monto confirmado
(CA-06.2).

**Razón:** sin atomicidad, una condición de carrera entre la verificación y la escritura permite
donaciones duplicadas o saldos incorrectos, el riesgo financiero central que RNF-HU-04 exige
mitigar.

### V. Mínimo privilegio

Cada función Lambda tiene su propio rol IAM con únicamente las acciones de DynamoDB y las tablas
que necesita; por ejemplo, la función de listado no puede escribir (CA-NF03.1, RNF-HU-03). No
debe existir `Action: "*"` ni `Resource: "*"` injustificado, ni credenciales AWS persistentes en
código o en CI (CA-NF03.2). Ningún integrante del equipo usa el usuario root para trabajar; cada
integrante tiene un usuario IAM propio con MFA y sin llaves de acceso de larga duración
(CA-NF03.3). Para despliegues se usan AWS CloudShell o credenciales temporales (design.md §7). Las
políticas IAM con comodines sugeridas por un asistente de IA no se aceptan sin justificación
explícita documentada (design.md §10).

**Razón:** en una cuenta compartida por el equipo, el aislamiento entre funciones e integrantes
depende enteramente de IAM; un privilegio excesivo convierte el compromiso de un solo componente
en el compromiso de todo el sistema, violando el principio Zero Trust de "asumir brecha".

### VI. Cuenta AWS Free plan única

El proyecto se despliega en una única cuenta AWS Free plan compartida por el equipo, en una sola
región (`us-east-2`, decisión de equipo que sustituye la recomendación original `us-east-1` de
design.md), con una alerta configurada en AWS Budgets (AD-06, CA-NF09.1).
Antes de desplegar cualquier servicio, el equipo DEBE verificar que esté incluido en la lista
oficial de servicios del AWS Free plan. Quedan excluidos del diseño los servicios no disponibles
en el Free plan: IAM Identity Center, AWS Organizations, AWS Verified Access, GuardDuty y Security
Hub (AD-06). Al cierre de la evaluación se ejecuta el procedimiento de limpieza (`sam delete`,
vaciado y eliminación de buckets S3, eliminación del user pool si no se borró con la pila) y se
verifica que no queden recursos activos (CA-NF09.2).

**Razón:** el curso exige evitar cargos inesperados y respetar las limitaciones reales de una
cuenta académica; diseñar sobre servicios no disponibles en el Free plan invalida la
reproducibilidad del proyecto para todo el equipo.

### VII. Stack tecnológico fijo

El stack tecnológico queda fijado según design.md §2 y no se sustituye sin justificación
documentada en el README ante incompatibilidades entre versiones mayores: TypeScript, React 19.3.x
sobre Vite, Tailwind CSS (Bootstrap prohibido), React Router, React Hook Form + Zod (esquemas
reutilizados en backend), TanStack Query, `oidc-client-ts` o AWS Amplify Auth para Authorization
Code + PKCE con tokens en memoria; backend en Node.js sobre AWS Lambda; Amazon API Gateway HTTP
API con JWT authorizer; Amazon Cognito User Pool con grupos y MFA TOTP; Amazon DynamoDB on-demand;
publicación vía S3 privado + CloudFront con OAC y response headers policy; CloudWatch Logs y
CloudTrail; AWS SAM/CloudFormation como IaC; Vitest + Testing Library + Bruno/Postman para
pruebas; ESLint + Prettier + typecheck; GitHub Actions para CI/CD. No se recomienda SSR ni
Next.js. Las versiones exactas se fijan en `package-lock.json`.

**Razón:** fijar el stack evita que las decisiones tecnológicas se re-discutan durante una semana
calendario de ejecución y asegura que la evaluación del curso compare proyectos sobre bases
equivalentes.

## Trazabilidad de requisitos

Los identificadores `HU-xx`, `CA-xx`, `RNF-HU-xx` y `T0x` definidos en requirements.md y design.md
se conservan EXACTOS en toda trazabilidad futura (especificaciones, planes, tareas, código, tests,
PRs e informe técnico). Está prohibido renumerar los identificadores existentes o inventar nuevos
identificadores que colisionen o sustituyan a los ya definidos; una nueva necesidad detectada
durante el desarrollo se documenta con un identificador adicional claramente distinguible (por
ejemplo, un sufijo o una historia nueva numerada en continuación de la secuencia existente), sin
alterar los ya asignados. Todo test, commit significativo, PR e informe técnico DEBE referenciar
al menos un identificador de esta trazabilidad (requirements.md §7).

**Razón:** esta es una decisión del equipo, no proveniente de requirements.md ni design.md,
adoptada para que la evaluación del curso y la revisión entre integrantes puedan rastrear cada
cambio hasta el requisito original sin ambigüedad ni renumeraciones que rompan los enlaces ya
documentados en el informe y en las pruebas T01–T14.

## Flujo de trabajo y control de cambios

La rama `main` está protegida; ningún cambio se integra directamente sobre ella (design.md §8).
Todo cambio se entrega mediante un Pull Request por bloque de trabajo y requiere la revisión de al
menos un integrante distinto de quien lo generó, incluyendo los cambios producidos o asistidos por
agentes de IA (design.md §10). Los tests se escriben antes de implementar la funcionalidad
correspondiente; un PR no se aprueba si introduce o modifica una regla de negocio, autorización o
idempotencia sin pruebas automáticas que la respalden (RNF-HU-08, CA-NF08.1). El CI de GitHub
Actions ejecuta lint, typecheck, tests y build en cada PR, y debe estar en verde antes de fusionar.
No se aceptan políticas IAM con comodines sugeridas por un asistente de IA sin justificación
explícita, y ningún agente con acceso a terminal ejecuta despliegues o comandos sobre la cuenta AWS
sin supervisión humana directa (design.md §10).

**Razón:** el primer punto (revisión por un integrante distinto del autor, PR por bloque) es una
decisión del equipo no presente en requirements.md ni design.md; el resto —tests antes de
implementar, CI en verde, restricciones sobre agentes de IA— proviene directamente de RNF-HU-08 y
de las reglas de uso de asistentes de design.md §10, y se consolida aquí para que todo el equipo
siga el mismo procedimiento sin excepciones.

## Governance

Esta constitución tiene precedencia sobre cualquier otra práctica, plantilla o convención del
repositorio cuando exista conflicto. Toda especificación (`/speckit-specify`), plan
(`/speckit-plan`), lista de tareas (`/speckit-tasks`) o PR DEBE verificar cumplimiento con los
siete principios y las dos secciones adicionales antes de aprobarse; cualquier complejidad o
desviación (por ejemplo, un control de seguridad simplificado) DEBE justificarse explícitamente en
el PR y en el informe técnico, nunca eliminarse en silencio (requirements.md §5: "se admite
simplificar la interfaz, no eliminar controles de seguridad").

Las enmiendas a esta constitución requieren: (a) una propuesta escrita señalando el principio o
sección afectada y la razón del cambio; (b) aprobación por revisión de al menos un integrante
distinto de quien propone la enmienda, igual que cualquier otro PR; (c) actualización de la fecha
de "Last Amended" y del número de versión según versionado semántico — MAJOR para eliminación o
redefinición incompatible de un principio, MINOR para la adición de un principio o sección, PATCH
para aclaraciones de redacción sin cambio de sustancia.

El cumplimiento de esta constitución se revisa en cada PR y, de forma integral, en los hitos de
cierre del proyecto (demo de los cuatro roles, ejecución de T01–T14, cierre y limpieza de recursos
AWS descritos en requirements.md §5). `requirements.md` y `design.md` siguen siendo la fuente de
verdad para el detalle funcional y técnico de cada historia de usuario; esta constitución fija los
principios no negociables que ningún diseño, plan o implementación posterior puede contradecir.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
