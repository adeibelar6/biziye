# ADEI → BIZIYE — documentación de la construcción (v1)

> ADEI fue el nombre de trabajo del proyecto; hoy se llama **BIZIYE** (de
> *bizi*, vivir en euskera). Este documento resume qué se ha construido, cómo
> está montado y en qué punto está. Los detalles viven en los otros tres
> documentos del repo:
>
> - [`biziye.md`](biziye.md) — la visión de producto (manda sobre todo lo demás)
> - [`PROMPT.md`](PROMPT.md) — el encargo de construcción de la v1
> - [`DECISIONES.md`](DECISIONES.md) — cada decisión técnica con su porqué
> - [`README.md`](README.md) — arranque, configuración, despliegue y backups

## Qué es

Una app personal de vida, de **un solo usuario**: una PWA instalable en el
móvil donde se registra todo — fallos, logros, notas, gastos, métricas
diarias, frases, chistes, primeras veces, tareas, eventos, cine,
suscripciones, vencimientos, préstamos, deseos — y una capa de IA que lo
clasifica al vuelo,
responde en un chat con acceso a los datos, guía el cierre del día y la
revisión semanal, escribe el informe mensual y mantiene un **perfil vivo**
sobre ti.

## Estado: v1 en producción (2026-07-16)

**La app está ON en https://biziye.fluxu.eus** — desplegada, con HTTPS,
notificaciones configuradas e IA real por suscripción. Ver «En producción»
más abajo.

Construida por fases, un commit por fase, cada una verificada como usuario
real contra la app en marcha antes de pasar a la siguiente:

| Fase | Commit | Contenido |
|------|--------|-----------|
| 0 — Cimientos | `52ffa69` | SvelteKit+TS, BD dual (PostgreSQL/PGlite), auth argon2 + sesión cookie, PWA con captura offline, Docker prod (Caddy + backups) |
| 1 — Capturar | `6514cc8` | Entrada universal + registro central de tipos, [+] con voz, inbox, timeline con buscador, métricas 1-5, pantalla Hoy |
| 2 — IA | `9ce9cd0` | Adaptador `mock`/`openai`/`bridge`, clasificación automática con umbral 0,6, chat con herramientas, cierre del día, privacidad con tests |
| 3 — Vida práctica | `444af60` | Motor de recordatorios + Web Push, suscripciones, vencimientos, préstamos, deseos (nevera 30 días), cine completo, anti-abandono |
| 4 — La IA aprende | `e5aa950` | Perfil vivo versionado, briefing matinal, informe mensual, revisión semanal, exportación JSON, seed de demostración |

**72 tests** en verde (vitest, contra PGlite real con las migraciones de
producción, no contra mocks) y typecheck sin errores.

Ajustes tras el estreno, pedidos usando la app de verdad (2026-07-16):

| Commit | Contenido |
|--------|-----------|
| `47341ac` | Hoy: las métricas de un toque solo se ofrecen desde las 19:00, como el cierre — por la mañana estorbaban |
| `3392825` | Cine: alta directa como vista (nota obligatoria y fecha, hoy por defecto), pestaña activa en la URL, filmoteca sin el tope de 100 |
| `54fb9f1` | docs: el puente de IA desplegado (ChatMock) y cómo recuperarlo |
| — | Tipo **evento** (reunión, cita, quedada): «apunta que hoy tengo reunión de fluxu a las 21:00» ya no cae al inbox — el clasificador recibe la fecha y hora actuales para resolver «hoy / mañana / el viernes / a las 9», limpia las muletillas del dictado, y el evento crea su aviso (push la mañana del día y «Avisos a la vista» en Hoy). El mock también lo entiende (con extracción de fecha/hora en `desde-texto.ts`) |

## Cómo está montado

- **Un solo proyecto SvelteKit** (TypeScript): las rutas de servidor son la
  API; adaptador Node para producción.
- **Entrada universal**: una tabla `entradas` con `payload` jsonb; cada tipo
  se define en un registro central de código (`src/lib/tipos`) — añadir un
  tipo nuevo no requiere migración.
- **Capa de datos única** (`src/lib/server/entradas.ts`): toda escritura pasa
  por ahí, y de ahí cuelga la sincronización del motor de recordatorios (una
  fila espejo por entrada que avisa: renovaciones, vencimientos, tareas con
  fecha, fin de enfriamiento). Un cron interno (tic por minuto, evaluadores
  idempotentes) dispara los avisos por Web Push; sin claves VAPID, al log.
- **Adaptador de IA** (`src/lib/server/ia`): interfaz única `ProveedorIA`
  con tres backends por `.env` — `mock` (heurísticas deterministas, la app
  entera funciona sin claves), `openai` (fetch directo, sin SDK) y `bridge`
  (cualquier proxy OpenAI-compatible; ver `docs/bridge.md`).
- **Regla dura de privacidad**: ninguna entrada `visible_ia = false`, ni de
  un apartado ocultado en Ajustes, sale hacia ningún proveedor — ni en chat,
  ni en clasificación, ni en informes ni en el perfil. El filtro vive en la
  consulta SQL (`entradasParaIA()`), única puerta de la IA a los datos, y hay
  tests que lo demuestran. La IA además se apaga entera desde Ajustes y la
  app sigue funcionando.
- **PWA**: instalable, con captura offline (cola en IndexedDB que sincroniza
  al volver la red) y notificaciones push (manejadores en `static/push-sw.js`,
  incorporados al service worker generado).
- **BD dual en dev**: con `DATABASE_URL` usa PostgreSQL; sin ella, PGlite
  (PostgreSQL embebido) — mismo SQL, mismas migraciones Drizzle.

## Pantallas

Barra inferior fija: **Hoy · Timeline · [+] · Chat · Apartados**.

- **Hoy**: saludo (Egun on / Arratsalde on / Gabon), briefing de la IA
  (cacheado por día), avisos a la vista, tareas, píldora del pasado y, desde
  las 19:00, las métricas de un toque y el cierre del día.
- **[+]**: texto libre + micrófono; con IA activa clasifica sola, si duda cae
  al inbox. Nada se pierde nunca por culpa de la IA.
- **Chat**: consultar («¿cuánto he gastado este mes?», «¿qué veo esta
  noche?») y capturar («apunta que…»), con historial.
- **Timeline**: todo en orden cronológico con filtros y buscador.
- **Apartados**: inbox, tareas, cine, suscripciones, vencimientos, préstamos,
  deseos, perfil vivo, informes y ajustes (tema, notificaciones, privacidad,
  contraseña, exportación JSON).

## En producción (2026-07-16)

- **VPS Hetzner** (Ubuntu 24.04): Docker Compose en `/opt/biziye` con app +
  PostgreSQL 17 + Caddy (HTTPS automático) + backup diario (`pg_dump` a las
  3:00, retención 30 días). Cortafuegos ufw: solo SSH, 80 y 443.
- **https://biziye.fluxu.eus** — DNS en Cloudflare en modo «solo DNS» (nube
  gris; con el proxy naranja Caddy no puede emitir el certificado).
- **Notificaciones**: claves VAPID generadas y en `.env.prod`.
- **IA real por suscripción** (la vía principal de `biziye.md`): puente
  **ChatMock** construido desde su código fuente en `/opt/chatmock`, con la
  sesión de la cuenta ChatGPT/Codex del usuario; `IA_PROVEEDOR=bridge`,
  modelo `gpt-5.5`. Solo accesible por la red interna de Docker — nunca
  publicar su puerto (no tiene auth propia y Docker puentea ufw). Montaje y
  recuperación en [`docs/bridge.md`](docs/bridge.md).

## Qué queda en manos del usuario

1. **Ensayar la restauración de un backup** en el VPS (instrucción escrita en
   el README, aún no ejecutada de punta a punta) — mejor ahora que apenas hay
   datos que perder.
2. **Rotar las credenciales del VPS**: la contraseña de root se compartió por
   chat durante el despliegue; el acceso por clave SSH ya está montado.
3. Usarla una semana en el móvil real antes de pedirle más — regla del
   roadmap de `biziye.md`.

Fuera de alcance v1 (a propósito): modo crisis, rueda de la vida, tipos
personalizados por UI, dashboards, importadores, multi-usuario en la
interfaz, fotos/vídeos.
