# BIZIYE — App personal de vida

## Visión

Una app (PWA web + móvil) donde registro **toda la información de mi vida** — fallos, fortalezas, notas, métricas, ideas — y una capa de **IA que la analiza** para devolverme patrones, correlaciones y preguntas que me hagan mejorar de verdad.

**Idea clave:** apuntar no sirve de nada si la app no te devuelve algo a cambio. El valor está en el ciclo completo: capturar → acumular contexto → analizar con IA → actuar.

## Principios de diseño

1. **Fricción cero al capturar.** Máximo 2 toques desde el móvil hasta estar escribiendo. Si hay que clasificar al capturar, no se usará.
2. **Todo entra por un inbox único.** Se clasifica después, en la revisión, no en el momento.
3. **La app devuelve valor.** Resúmenes, patrones y correlaciones — no un cementerio de notas.
4. **Construido desde 0** para poder modelar cualquier cosa que quiera registrar en el futuro.
5. **Privacidad por diseño: yo decido qué ve la IA.** Cada entrada (y cada tipo/apartado) tiene un interruptor "análisis IA sí/no". Los datos viven en mi infraestructura (dispositivo + servidor propio); **solo lo marcado como visible se envía a la API de IA**. No toda mi vida viaja a servidores de terceros.

## Modelo de datos: todo es una "entrada"

Una sola entidad flexible en vez de tablas rígidas:

```
Entrada {
  tipo: nota | fallo | logro | hábito | métrica | idea | gasto | ...
  timestamp
  tags: []
  contexto: { dónde, con quién, estado de ánimo }
  visible_ia: sí | no   ← interruptor de privacidad (principio 5)
  payload: JSON libre según el tipo
}
```

Ventajas:
- Nuevos tipos de registro sin tocar la base de datos.
- Cruzar datos entre tipos ("¿mis fallos correlacionan con dormir mal?").
- Un solo buscador y una sola línea temporal para toda mi vida.
- Es exactamente el formato que la IA necesita para analizar.

## Módulos

### 1. Inbox universal
Punto de entrada único para todo. Captura en segundos, clasificación después.

### 2. Registro de fallos con contexto
No solo "qué hice mal": qué lo disparó, en qué situación, qué hice en su lugar.
Con el tiempo la app muestra patrones ("el 70% de tus fallos de X ocurren los domingos por la noche").

### 3. Evidence log de fortalezas
Registrar en 10 segundos cada cosa que sale bien. Sirve para:
- Reforzar: ver qué condiciones hacen que rinda.
- Munición real contra los días malos y para autoevaluaciones.

### 4. Métricas diarias mínimas
Ánimo, energía, sueño en escala 1-5, un toque cada una.
Son el "eje X" contra el que cruzar todo lo demás.

### 5. Revisión semanal guiada
El domingo la app hace 4-5 preguntas fijas (¿qué falló? ¿qué funcionó? ¿qué repito la semana que viene?) enseñando antes el resumen de la semana. **Este ritual cierra el círculo.**

### Captura por voz (no descartado — probable)
Dictar entradas en vez de escribirlas, para reducir la fricción casi a cero:
- **v1:** botón de micro en el inbox → dictado a texto (Web Speech API del navegador, gratis).
- **v2:** la IA recibe el texto dictado y lo estructura sola: detecta el tipo (fallo, logro, nota...), pone tags y rellena el contexto. Dices "hoy la he liado en la reunión por no preparármela" y la app crea la entrada tipo `fallo` con su contexto, sin tocar nada.

### 6. Capa de IA ⭐ (el corazón de la app)
Análisis periódico de todas las entradas con la API de Claude:
- **Resumen mensual:** patrones, tendencias, correlaciones entre métricas y fallos/logros.
- **Detección de patrones ocultos:** cosas que yo no veo por estar dentro.
- **Preguntas incómodas:** la IA como espejo, no como asistente complaciente.
- A futuro: chat sobre mi propia vida ("¿cuándo fue la última vez que...?", "¿qué suele pasar antes de que...?").

**La IA aprende de mí (perfil vivo)** ⭐⭐ — concepto central aprobado:
- La IA mantiene un **documento-perfil sobre mí** que actualiza con cada análisis: mis patrones, disparadores, debilidades, qué funciona conmigo y qué no.
- Es mi "manual de instrucciones" escrito por alguien que me observa con datos. Puedo leerlo y corregirlo.
- Cada nuevo análisis parte de ese perfil acumulado → la IA no empieza de cero cada vez: **cuanto más la uso, mejor me conoce**.
- El perfil alimenta al resto de funciones: briefing matinal, predicciones, preguntas del cierre del día.

**Chat general** ⭐ (aprobado) — la app está organizada por apartados, pero hay **un solo chat** que lo cruza todo, con doble función:
- **Consultar:** "¿cuándo fue la última vez que...?", "¿qué películas me recomendó Jon?", "¿cómo llevo el trimestre?".
- **Capturar y ordenar:** le escribo cualquier cosa en lenguaje natural y la IA la clasifica sola en el apartado correcto — "apunta que Ana me recomendó Dune" → entrada en cine/pendientes con recomendadora; "he pagado 12 € del gimnasio" → gasto. El chat es la puerta universal; los apartados, el archivo ordenado.

**Límite de privacidad:** la IA (análisis, perfil vivo y chat) solo ve las entradas marcadas como visibles para IA (principio 5). Lo privado no sale de mi infraestructura.

### 7. Tareas ligeras (aprobado)
To-dos del día a día ("comprar pilas", "llamar al taller"), capturados por chat, voz o inbox como todo lo demás.
- **Alcance contenido a propósito:** lista simple + recordatorio opcional. NO es un gestor de proyectos — eso se comería la app.
- Conecta con el motor de recordatorios y con la IA (el briefing matinal recuerda lo pendiente).

## Registros adicionales (aprobados, para después del MVP)

Nuevos tipos de entrada — gracias al modelo "todo es una entrada", cada uno es solo un `tipo` nuevo con su payload, no una tabla nueva:

1. **Diario de 3 líneas** — qué pasó, cómo me sentí, qué aprendí. Alimenta muchísimo a la IA.
2. **Gastos rápidos** — importe + categoría en 2 toques. El dinero también cuenta la historia de mi vida.
3. **Registro de decisiones importantes** — qué decidí, por qué, y qué espero que pase. Meses después la app la reenseña para comprobar si acerté. Clave para detectar sesgos propios.
4. **CRM personal** — ficha por persona: cumpleaños, última conversación, detalles que me contó. Avisos tipo "hace 2 meses que no hablas con X".
5. **Salud y síntomas** — dolores, alergias, medicación... cruzado con sueño/ánimo es oro para la IA.
6. **Comida y entrenamiento** — versión simple: foto o una línea de texto, sin contar calorías.
7. **Lecturas y aprendizajes** — libros, artículos, vídeos + la idea clave de cada uno.
8. **Parking de ideas** — ideas de proyectos/negocios que ahora no tocan, para que no se pierdan ni distraigan.
9. **Gratitud** — una cosa buena al día.

## Ideas segunda ronda (aprobadas)

### Datos que entran solos
- **Contexto automático en cada entrada** ⭐ — día de la semana, hora, clima, ubicación opcional, añadidos sin esfuerzo. La IA descubre cosas como "tus fallos se concentran los lunes lluviosos".
- **Importadores** — calendario, actividad física (Google Fit/Apple Health), CSV del banco, Spotify...
- **Tiempo de pantalla** — cruzado con ánimo y productividad.

### La IA como copiloto (no solo analista)
- **Briefing matinal** ⭐ — resumen de agenda + aviso basado en mis datos ("las últimas 3 veces que dormiste <6h tuviste conflictos; hoy ve con calma").
- **Cierre del día guiado** — 2-3 preguntas concretas según lo que pasó ese día, no cuestionario genérico.
- **Predicciones de riesgo** — "esta semana tiene la misma pinta que las 2 en las que acabaste quemado". Adelantarse al fallo.

### Yo pasado y yo futuro
- **Cartas a mi yo futuro** — la app las entrega en 6 meses / 1 año. Potente combinado con el registro de decisiones.
- **Comparativas temporales** — "yo hace un año vs. yo ahora", con mis propias métricas y palabras.
- **Archivo de momentos buenos** — botón para días malos que enseña una selección de momentos felices.

### Rumbo
- **Rueda de la vida con datos reales** ⭐ — puntuación por áreas (salud, trabajo, relaciones, finanzas, ocio) calculada desde entradas reales, no de un test. Ves qué área descuido *ahora*.
- **Valores declarados** — defino mis 3-5 valores; en la revisión mensual la IA evalúa si mis acciones se alinean con ellos.

### Personalización total (la ventaja de hacerlo desde 0)
- **Tipos de entrada creados por mí** ⭐ — editor de nuevos registros con sus campos (texto, número, escala, foto, selector) sin tocar código. La app crece conmigo para siempre.
- **Dashboards a mi gusto** — elijo qué gráficas veo en la pantalla principal, por temporadas.

## Ideas cuarta ronda (aprobadas)

- **Checklists reutilizables** — maleta de verano, kit de camping... se hacen perfectas una vez y se reutilizan siempre.
- **Hitos de la gente que quiero** — primeras veces de hijos/sobrinos, momentos familiares importantes. Archivo emocional, distinto del CRM.
- **Modo crisis** ⭐ — botón para los días muy malos: archivo de momentos buenos + evidence log de fortalezas + protocolo definido por mí en frío ("respira, llama a X, sal a andar") y, opcionalmente, la IA hablándome con contexto de quién soy. Mi yo estable cuidando de mi yo hundido.
- **Registro de primeras veces** — cada cosa que hago por primera vez. Mide cuánta novedad hay en mi vida; cuando baja mucho, la rutina me está comiendo y la IA avisa.
- **Frases que me marcaron** — citas de libros, cosas que me dijo alguien. Reaparecen de vez en cuando en el briefing matinal.
- **Chistes** — apuntar chistes (oídos o propios) para no perderlos. Pueden reaparecer en el briefing o en el modo crisis para sacar una sonrisa.

## Pendientes de rondas anteriores (no descartadas)

Anti-hábitos · Experimentos personales · Bot de Telegram · "Tal día como hoy" · Informe anual · Mapa de calor de actividad · Exportación total · Cifrado de entradas sensibles

## Ideas tercera ronda (aprobadas): vida práctica

La parte "asistente de la vida práctica" — hace que la app se use a diario aunque no apetezca reflexionar, y también alimenta a la IA (el dinero y los papeleos también cuentan mi historia).

### Dinero bajo control
- **Gestor de suscripciones** ⭐ — todas las suscripciones con precio y fecha de renovación, aviso antes del cobro, **coste anual total** ("gastas 640 €/año") y auditoría periódica ("¿sigues usando esta?").
- **Mapa de gastos fijos** — el "coste de existir" mensual, separado del gasto variable. La IA avisa de subidas ("la luz +18% en 3 meses").
- **Préstamos personales** — "le dejé 50 € a Mikel el 3 de mayo".
- **Lista de deseos con enfriamiento** ⭐ — compras no esenciales esperan 30 días; la app enseña cuánto he ahorrado en cosas que se me pasaron.
- **Garantías y facturas** — foto del ticket + fecha fin de garantía.

### Papeleos y fechas límite
- **Vencimientos vitales** ⭐ — DNI, pasaporte, ITV, seguros, revisiones... con avisos con antelación real.
- **Trámites en curso** — cada gestión abierta con su estado, que nada muera en el limbo.
- **Bóveda rápida** — pólizas, IBAN, matrícula, tallas (mías y de la familia)... los datos que busco 20 veces al año.

### Cosas, personas, sitios
- **Prestado / me prestaron** — con persona y fecha.
- **Ideas de regalos** — capturadas todo el año, vinculadas al CRM personal.
- **Recomendaciones recibidas** ⭐ — series, libros, restaurantes... con quién lo recomendó; al consumirlo puntúo y la IA aprende de quién fiarse ("las de Ana aciertan el 90%").
- **Sitios pendientes** — restaurantes y lugares por visitar.

### Día a día
- **Comidas que funcionan** — recetario personal de lo que salió bien, con foto.
- **Lista de la compra con memoria** — aprende lo recurrente y sugiere lo que falta.
- **Historial médico propio** — visitas, resultados y vacunas en mi poder.

## Módulo de cine y series ⭐ (aprobado)

Mi biblioteca cultural personal — conecta con "Recomendaciones recibidas":

- **Pendientes:** lo que me han recomendado (y quién) + lo que yo apunto. Al abrir el módulo veo qué ver esta noche.
- **Visto:** registro de lo ya visto, con fecha y **nota personal** (ej. 1-10).
- **Ranking:** mis películas/series ordenadas por nota — mi top personal de todos los tiempos.
- **Estadísticas:** cuánto veo, géneros favoritos, mejor año de cine...
- **Con IA:** perfil de gusto propio → "de tu lista de pendientes, esta noche te encajaría X"; y fiabilidad por recomendador.
- **Ampliable** al resto de consumo cultural con el mismo esquema: libros, juegos, música, podcasts (solo son tipos nuevos de entrada).

## Arquitectura

- **PWA primero:** una sola base de código, instalable en el móvil, offline, notificaciones.
- **Frontend: SvelteKit + TypeScript (decidido).** Fullstack: las rutas de servidor de SvelteKit hacen de API — un solo proyecto, un solo despliegue.
- **Backend propio en Hetzner (decidido):** VPS con la base de datos (PostgreSQL) y la API. Los datos viven en mi servidor, no en nubes de terceros — coherente con el principio 5.
- **Copias de seguridad (decidido):** automáticas y cifradas desde el día 1 — dump diario de la BD + copia fuera del servidor. Si pierdo el móvil no pierdo nada; si muere el servidor, tampoco.
- **Un solo usuario (decidido):** la app es para mí — login simple de una sola cuenta. La BD se deja igualmente con separación por usuario (una columna, cuesta cero ahora) por si algún día se abre a más gente; evita una migración dolorosa después.
- **Caché offline en el cliente:** capturar sin conexión; sincroniza al volver.
- **IA: API de OpenAI (ChatGPT) — decidido.** ⚠️ Nota: la suscripción de ChatGPT NO incluye la API (se paga aparte, por uso). La capa de IA se construirá **agnóstica al proveedor** (adaptador), para poder cambiar OpenAI ↔ Claude ↔ otro sin tocar la app.
  - **Vía principal — puente por suscripción (tipo OpenClaw):** un backend del adaptador que usa la autenticación de MI suscripción de ChatGPT (como hace OpenClaw con Codex). Zona gris de los términos de servicio, asumida: uso personal, una sola cuenta, la mía. Puede romperse cuando OpenAI cambie la autenticación.
  - **Plan B si el puente se rompe:** API oficial de pago por uso (OpenAI o Claude) — mismo adaptador, solo cambia la configuración.
  - (Si algún día se abre a más gente: modelo BYOK — cada usuario su propia clave de API.)
- **Fotos y vídeos: NO se almacenan (decidido).** La app guarda solo referencias/enlaces; el archivo vive en la galería/nube de cada usuario.
- **Móvil nativo después** solo si la PWA se queda corta (widgets, etc.) — con Capacitor se envuelve la misma PWA.
- **Motor de recordatorios/recurrencias** — pieza transversal que sale de la ronda de vida práctica: renovaciones de suscripciones, vencimientos, cumpleaños, enfriamiento de 30 días, "hace 2 meses que no hablas con X"... Se construye una vez y todos los módulos la reutilizan.

## Flujo de pantallas (propuesta de Claude Code)

Navegación: **barra inferior con 5 elementos** — Hoy · Timeline · **[+]** · Chat · Apartados.

1. **Hoy (pantalla de inicio):** el briefing — saludo, resumen del día (agenda vía IA, tareas pendientes), métricas de 1 toque si aún no las he registrado, y una píldora del pasado ("tal día como hoy" / frase / chiste). Es la pantalla que hace que abrir la app dé algo a cambio.
2. **[+] (botón central, siempre visible):** captura en 2 toques. Abre un campo de texto libre con botón de micro; escribo/dicto y la IA clasifica sola (o elijo tipo a mano si quiero). A inbox si no hay conexión o la IA duda.
3. **Chat:** la puerta universal — preguntar ("¿qué me recomendó Ana?") y capturar conversando. Historial de conversaciones.
4. **Timeline:** toda mi vida en orden cronológico, con filtros por tipo/tag/texto. El buscador vive aquí.
5. **Apartados:** rejilla de módulos (Dinero, Cine, Personas, Salud, Tareas, Reflexión...). Cada módulo tiene su vista propia (ranking de cine, coste anual de suscripciones...). Los módulos se pueden anclar/ocultar — la rejilla crece conmigo.
6. **Ajustes** (desde Apartados): privacidad IA (interruptores por apartado), notificaciones, backups, adaptador de IA.

**Modo crisis:** accesible desde Hoy con un gesto discreto (mantener pulsado el saludo) — no es un botón visible que dé pereza ver todos los días.

## Roadmap por fases (propuesta de Claude Code)

**Fase 0 — Cimientos (primera semana)**
VPS Hetzner + PostgreSQL + backups automáticos · API backend · PWA esqueleto instalable en el móvil · login · modelo de entrada universal con `visible_ia`.

**Fase 1 — Capturar (semanas 2-3) → objetivo: usarla a diario**
Botón [+] con tipos básicos (nota, fallo, logro, tarea, gasto) · métricas diarias de 1 toque · Timeline con buscador · dictado por voz v1 · pantalla Hoy en versión simple.

**Fase 2 — Entra la IA (semanas 4-5)**
Adaptador de IA + puente por suscripción · Chat general (consultar + clasificar) · interruptores de privacidad · cierre del día guiado.

**Fase 3 — Vida práctica (mes 2)**
Motor de recordatorios · suscripciones · vencimientos vitales · préstamos · lista de deseos con enfriamiento · **módulo de cine completo**.

**Fase 4 — La IA aprende (mes 3)**
Perfil vivo · revisión semanal guiada · briefing matinal completo (con calendario) · informe mensual · contexto automático en entradas.

**Fase 5 — A demanda (sin fecha)**
Modo crisis · rueda de la vida · tipos de entrada personalizados · dashboards · importadores · cartas al futuro · CRM personal · resto de módulos aprobados.

**Regla del roadmap:** no se empieza una fase sin usar lo de la anterior al menos una semana en el móvil real. La app se valida usándola, no construyéndola.

## Decisiones de producto tomadas

- **Nombre: BIZIYE.**
- **Tareas: sí** — versión ligera (módulo 7), no gestor de proyectos.
- **Fotos/vídeos: no se almacenan** — solo referencias.
- **Un solo usuario: yo.** Sin BYOK ni gestión de cuentas; la BD queda preparada por si algún día cambia.
- **Servidor: Hetzner** + copias de seguridad automáticas.
- **IA: API de OpenAI** (con adaptador agnóstico al proveedor).
- **Privacidad** (principio 5): interruptor "IA sí/no" por entrada y por apartado.
- **Anti-abandono: reenganche con mala leche** — si dejo de registrar, la app me lo dice a la cara, con tono borde/humor ("eres una mierda, vuelve"). (Si algún día la usa más gente, se hará configurable — no todo el mundo querrá que su app le insulte 😄.)
- **Diseño UX/UI y funcionamiento: delegado a Claude Code** — propondrá flujo de pantallas, estética y comportamiento completos.
- **Calendario: no se muestra en la app.** La agenda (Google Calendar) la usa la IA por detrás como contexto — briefing matinal tipo "hoy tienes 3 reuniones, la semana pinta densa".

## Pendiente de decidir

- **Política de notificaciones:** qué avisa y qué no, cuántas al día, cómo se agrupan. Se decidirá módulo a módulo.
- **Métrica de éxito:** cómo sabré que la app "sirve de verdad". Se verá con el uso.
- Detalle técnico de privacidad: si además se anonimiza/agrega lo que sí se envía a la IA.
