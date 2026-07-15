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
diarias, frases, chistes, primeras veces, tareas, cine, suscripciones,
vencimientos, préstamos, deseos — y una capa de IA que lo clasifica al vuelo,
responde en un chat con acceso a los datos, guía el cierre del día y la
revisión semanal, escribe el informe mensual y mantiene un **perfil vivo**
sobre ti.

## Estado: v1 completa (2026-07-15)

Construida por fases, un commit por fase, cada una verificada como usuario
real contra la app en marcha antes de pasar a la siguiente:

| Fase | Commit | Contenido |
|------|--------|-----------|
| 0 — Cimientos | `52ffa69` | SvelteKit+TS, BD dual (PostgreSQL/PGlite), auth argon2 + sesión cookie, PWA con captura offline, Docker prod (Caddy + backups) |
| 1 — Capturar | `6514cc8` | Entrada universal + registro central de tipos, [+] con voz, inbox, timeline con buscador, métricas 1-5, pantalla Hoy |
| 2 — IA | `9ce9cd0` | Adaptador `mock`/`openai`/`bridge`, clasificación automática con umbral 0,6, chat con herramientas, cierre del día, privacidad con tests |
| 3 — Vida práctica | `444af60` | Motor de recordatorios + Web Push, suscripciones, vencimientos, préstamos, deseos (nevera 30 días), cine completo, anti-abandono |
| 4 — La IA aprende | `e5aa950` | Perfil vivo versionado, briefing matinal, informe mensual, revisión semanal, exportación JSON, seed de demostración |

**57 tests** en verde (vitest, contra PGlite real con las migraciones de
producción, no contra mocks) y typecheck sin errores.

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
  (cacheado por día), avisos a la vista, métricas de un toque, tareas,
  píldora del pasado y, desde las 19:00, el cierre del día.
- **[+]**: texto libre + micrófono; con IA activa clasifica sola, si duda cae
  al inbox. Nada se pierde nunca por culpa de la IA.
- **Chat**: consultar («¿cuánto he gastado este mes?», «¿qué veo esta
  noche?») y capturar («apunta que…»), con historial.
- **Timeline**: todo en orden cronológico con filtros y buscador.
- **Apartados**: inbox, tareas, cine, suscripciones, vencimientos, préstamos,
  deseos, perfil vivo, informes y ajustes (tema, notificaciones, privacidad,
  contraseña, exportación JSON).

## Qué queda en manos del usuario

1. `npm run generar-vapid` + reiniciar → notificaciones push reales.
2. Elegir proveedor de IA real en `.env` (`openai` o `bridge`).
3. Desplegar en el VPS (guía paso a paso en el README) y **ensayar allí la
   restauración de un backup** (instrucción escrita, no ejecutada aún: en la
   máquina de construcción no había Docker).
4. Usarla una semana en el móvil real antes de pedirle más — regla del
   roadmap de `biziye.md`.

Fuera de alcance v1 (a propósito): modo crisis, rueda de la vida, tipos
personalizados por UI, dashboards, importadores, multi-usuario en la
interfaz, fotos/vídeos.
