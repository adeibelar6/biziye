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

**Cron interno con registro de evaluadores.**
Un `setInterval` por minuto dentro del propio proceso Node (no cron del sistema)
con una lista de evaluadores idempotentes. Suficiente para un solo usuario,
cero dependencias, y sobrevive al HMR de dev con una guardia en `globalThis`.
