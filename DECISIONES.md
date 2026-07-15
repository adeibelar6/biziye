# DECISIONES — BIZIYE

Registro de decisiones técnicas y de producto tomadas durante la construcción,
con su porqué. Complementa a `biziye.md` (visión) y `PROMPT.md` (encargo).

## Fase 0 — Cimientos

**PGlite como base de datos de desarrollo sin Docker.**
En la máquina donde se construyó esto no hay Docker instalado. En vez de parar
(regla 3 del encargo), la capa de BD es dual y se elige por `.env`: si hay
`DATABASE_URL` se usa PostgreSQL de verdad (docker compose / producción); si no,
PGlite — PostgreSQL 17 compilado a WASM, embebido en el proceso, con los datos
en `./data/pglite`. Es el mismo motor, el mismo SQL, el mismo esquema Drizzle y
las mismas migraciones. Nada de la app sabe cuál de los dos hay debajo.

**Migraciones al arrancar.**
La app aplica las migraciones de `./drizzle` en el arranque (y existe
`npm run db:migrar` para hacerlo a mano). Para una app de usuario único elimina
un paso manual entero y hace que `npm run dev` funcione a la primera.

**Argon2 vía `@node-rs/argon2`.**
Binarios precompilados (sin toolchain de C en Windows), mantenido, y es argon2id
por defecto.

**Sesiones deslizantes de 60 días en cookie httpOnly.**
Una app personal que te desloguea cada semana acaba abandonada. El token se
renueva solo cuando quedan menos de 30 días. `secure` se controla con
`COOKIE_SEGURA` porque en dev/LAN se sirve por HTTP.

**Freno de fuerza bruta en memoria.**
5 fallos seguidos → 30 s de bloqueo. Para un solo usuario no hace falta más
(no hay tabla de intentos ni dependencia extra).

**Offline: cola en IndexedDB + página `/offline` prerenderizada.**
El service worker (generateSW de Workbox) precachea el shell y usa
NetworkFirst para navegación con fallback a `/offline`, que es una pantalla de
captura que funciona sin red. La cola vive en IndexedDB y se vacía contra
`/api/capturar` al volver la conexión (evento `online` + al abrir la app), con
`idCliente` para idempotencia. Se eligió esto frente a Background Sync API por
fiabilidad dispar entre navegadores.

**Service worker solo en build/preview, no en `vite dev`.**
El modo dev de vite-plugin-pwa con generateSW es limitado y ensucia la consola
(criterio: cero errores). La PWA se prueba con `npm run build && npm run preview`.

**Identidad visual: verde monte + papel txakoli + rojo amapola.**
«Bizi» es euskera; la paleta sale de ese mundo (monte, sidrería, cartel vasco
antiguo) y huye a propósito del combo crema+terracota+serif que es el cliché
del diseño generado por IA. Display: Bricolage Grotesque (autoalojada vía
Fontsource, funciona offline). Cuerpo: pila del sistema, por rendimiento.
Saludos en euskera (Egun on / Arratsalde on / Gabon) como guiño de identidad;
el resto de la interfaz, en castellano como manda el encargo.

**Iconos PWA generados por script (`npm run generar-iconos`).**
Un SVG dibujado en código (pulso vital sobre verde noche) rasterizado con
sharp a 180/192/512 + maskable. Sin binarios opacos en el repo… los PNG están
commiteados para que clonar y arrancar funcione, pero se regeneran con una orden.

**Backups: contenedor propio con pg_dump diario y rotación.**
Un servicio `backup` (imagen postgres, sin software extra) hace `pg_dump | gzip`
cada 24 h a `./backups` del host y borra los que pasen de `BACKUP_DIAS_RETENCION`
(30 por defecto). La copia externa (rclone/rsync/restic) se documenta en el
README como paso manual del VPS, porque depende de dónde quieras mandarla.

**PGlite fuera de OneDrive y con candado anti doble-apertura.**
Durante la verificación de Fase 0, abrir la BD embebida desde dos procesos a la
vez (dev + preview) corrompió el directorio de datos, y además el proyecto vive
dentro de OneDrive, cuya sincronización bloquea archivos. Solución doble:
`PGLITE_DIR` en `.env` apunta los datos a `%LOCALAPPDATA%\biziye\pglite`
(fuera de la carpeta sincronizada), y un archivo-candado con PID
(`<dir>.lock`) hace que el segundo proceso falle con un mensaje claro en vez
de corromper nada. Los candados huérfanos de procesos muertos se retiran solos.

## Fase 2 — IA

**El filtro de privacidad vive en la capa de datos, con tests contra BD real.**
`entradasParaIA()` (src/lib/server/ia/datos.ts) es la única puerta por la que
la IA lee entradas: fuerza `visible_ia = true` en el SQL y excluye los tipos
ocultos de Ajustes. Chat, herramientas, cierres e informes leen solo de ahí.
Los tests de `privacidad.test.ts` lo demuestran contra PGlite en memoria con
las migraciones reales — no contra mocks.

**La clasificación envía al proveedor únicamente el texto recién capturado.**
Es inherente a «con IA activa clasifica sola»: ese texto aún no es una entrada
y no tiene interruptor. Quien no quiera que un texto viaje puede elegir tipo a
mano (no se clasifica), apagar la IA entera, o marcar el apartado como oculto
— en ese caso la entrada resultante nace además con `visible_ia = false`.

**El puente (bridge) habla protocolo OpenAI contra una URL configurable.**
No se reimplementa la autenticación de la suscripción de ChatGPT (cambia sin
aviso y se rompería en silencio): `IA_PROVEEDOR=bridge` + `BRIDGE_URL` apuntan
a cualquier proxy OpenAI-compatible (OpenClaw, LiteLLM…) que use tu
suscripción por detrás. Mismo adaptador que `openai`, otra URL y otro token.
Detalle y opciones concretas en docs/bridge.md.

**OpenAI sin SDK: fetch al protocolo /chat/completions.**
Menos dependencias, control total del bucle de function calling (máx. 5
vueltas de herramientas) y el mismo código sirve para el puente.

**Umbral de confianza 0,6 y el inbox como red.**
Clasificación con confianza < 0,6, payload inválido o proveedor caído →
sin_clasificar al inbox. La captura JAMÁS se pierde por culpa de la IA.

**El cierre del día se guarda como nota con etiqueta `cierre`.**
No hace falta un tipo nuevo ni una tabla: es una entrada más (buscable en el
timeline), y la etiqueta permite saber si hoy ya se cerró. Se ofrece en Hoy a
partir de las 19:00 si la IA está activa.

**Cron interno con registro de evaluadores.**
Un `setInterval` por minuto dentro del propio proceso Node (no cron del sistema)
con una lista de evaluadores idempotentes. Suficiente para un solo usuario,
cero dependencias, y sobrevive al HMR de dev con una guardia en `globalThis`.

## Fase 3 — Vida práctica

**Los recordatorios son un espejo sincronizado desde la capa de datos.**
Cada entrada con aviso (suscripción, vencimiento, tarea con fecha, deseo
enfriándose) mantiene UNA fila en `recordatorios`, actualizada dentro de
`crearEntrada`/`editarEntrada`/`borrarEntrada`. Al vivir en la capa de datos
ningún camino de escritura (API, formularios, chat, cola offline) puede
olvidarse de sincronizar. El cron solo mira `proximo_aviso` y dispara.

**Disparo idempotente: o se apaga o se empuja al futuro.**
Un aviso de regla única se desactiva al disparar; uno recurrente avanza
`fecha_objetivo` al periodo siguiente (conservando el día del mes, con tope en
febrero). Ejecutar el evaluador de más nunca duplica notificaciones.

**El payload del usuario no se reescribe solo (con una excepción).**
`proxima_renovacion` guarda lo que escribió el usuario; las vistas calculan la
«renovación efectiva» avanzando periodos (src/lib/vida-practica.ts). La
excepción es el deseo: al cumplir 30 días el cron sí persiste
`estado: disponible`, porque ese cambio es el producto (y la vista además lo
calcula por si el cron aún no pasó).

**Web Push con generateSW + importScripts.**
Cambiar a injectManifest solo para dos listeners era pagar mantenimiento de un
service worker entero. `static/push-sw.js` (push + notificationclick) se
incorpora al SW generado con `workbox.importScripts`. Sin claves VAPID en
`.env`, los avisos caen al log del servidor y la app sigue entera
(`npm run generar-vapid` los activa).

**Anti-abandono con techo y horario.**
14 días sin registrar → aviso borde (5 variantes rotadas por día, como manda
biziye.md). Máximo uno por semana (estado en `config`) y solo de 10:00 a 21:00:
el humor negro a las 4 de la mañana no re-engancha a nadie.

**El enfriamiento se respeta también en el servidor.**
«Lo compro» sobre un deseo aún enfriándose devuelve error aunque alguien fuerce
el formulario: los 30 días son la función, no una sugerencia de interfaz.
