# PROMPT DE CONSTRUCCIÓN — BIZIYE v1

> Uso: abre una sesión de Claude Code en esta carpeta y pega este documento entero como primer mensaje.

---

## Misión

Construye **BIZIYE**, mi aplicación personal de vida: una PWA instalable en el móvil y usable en el ordenador donde registro toda mi vida (fallos, logros, métricas, gastos, cine, tareas...) y una capa de IA la analiza, aprende de mí y me devuelve valor.

Debes construirla **completa** (fases 0 a 4 del roadmap), funcional de verdad, bonita y lista para usar en el día a día desde el primer arranque. **Tarda lo que necesites: la prioridad absoluta es que todo funcione bien, no la velocidad.** No dejes pantallas vacías, funciones a medias, datos falsos hardcodeados ni comentarios TODO.

**Antes de escribir una sola línea de código, lee `biziye.md` entero.** Es el documento de visión del producto y manda sobre este prompt en cualquier duda de producto. Este prompt concreta lo técnico y el alcance.

## Reglas de proceso

1. Ejecuta `git init` al empezar. Un commit al completar cada fase, con mensaje descriptivo.
2. Trabaja por fases en orden (0 → 4). **Antes de pasar a la siguiente fase, verifica la actual como un usuario real:** arranca la app, recorre los flujos, corrige lo que esté roto. No des nada por hecho sin haberlo visto funcionar.
3. Si algo externo te bloquea (servidor Hetzner, claves de API, credenciales), **no te pares**: implementa la pieza configurable por variables de entorno, déjala funcionando con el backend `mock`, y documenta en el README los pasos manuales exactos que me tocan a mí.
4. No me preguntes salvo bloqueo total. Decide tú con criterio y registra cada decisión relevante en un archivo `DECISIONES.md` (qué decidiste y por qué).
5. Al terminar, entrégame un resumen: qué hay construido, cómo se arranca en local, cómo se despliega, y la lista de pasos manuales que me quedan.

## Stack (cerrado — no lo cambies)

- **SvelteKit + TypeScript**, fullstack: las rutas de servidor (`+server.ts` / form actions) son la API. Un solo proyecto, un solo despliegue.
- **PostgreSQL** con **Drizzle ORM** y migraciones versionadas. `docker-compose` levanta la BD en dev y todo en prod.
- **PWA**: manifest + service worker (`@vite-pwa/sveltekit`). Instalable en Android/escritorio, funciona offline, y la captura sin conexión se encola y sincroniza al volver la red.
- **Auth**: usuario único — contraseña con hash argon2, sesión por cookie httpOnly. El esquema de BD lleva `user_id` en todas las tablas (por si algún día se abre a más gente), pero la UI no tiene registro ni gestión de usuarios.
- **Notificaciones**: Web Push (VAPID) enviadas desde el servidor por el motor de recordatorios.
- **Deploy**: `docker-compose.prod.yml` con: app (Node adapter), PostgreSQL, Caddy (HTTPS automático) y un servicio de backup (pg_dump diario, rotación 30 días, copia opcional a destino externo configurable). Guía paso a paso para un VPS Hetzner con Ubuntu en el README.
- **Idioma de la interfaz: castellano.** Zona horaria: Europe/Madrid.

## Modelo de datos (núcleo)

La entidad central es la **entrada universal**:

```
entrada {
  id, user_id, tipo, timestamp,
  tags: text[],
  contexto: jsonb  (dia_semana, hora, ubicacion?, animo?, ...)
  visible_ia: boolean  (por defecto: según configuración del tipo)
  payload: jsonb  (estructura según tipo)
  creado_en, editado_en, borrado_en (soft delete)
}
```

- Los **tipos de entrada** se definen en un registro central de código (icono, nombre, esquema del payload, componente de vista/formulario, visible_ia por defecto). Añadir un tipo nuevo = añadir una definición, sin migración.
- Tablas de apoyo: `recordatorios` (motor de recurrencias: fecha objetivo, regla de repetición, antelación de aviso, entrada asociada), `perfil_vivo` (documento markdown versionado que mantiene la IA), `chat_conversaciones` + `chat_mensajes`, `push_subscriptions`, `config`.
- **Motor de recordatorios**: pieza transversal. Un job programado (cron dentro de la app) evalúa recurrencias y dispara Web Push. Lo usan: suscripciones, vencimientos, cumpleaños, enfriamiento de 30 días, tareas.

## Adaptador de IA (agnóstico al proveedor)

Define una interfaz única `ProveedorIA` y tres backends seleccionables por `.env`:

1. **`mock`** (por defecto en dev): respuestas deterministas y razonables — permite desarrollar y probar TODA la app sin ninguna clave. La clasificación mock usa heurísticas por palabras clave.
2. **`openai`**: API oficial (`OPENAI_API_KEY` en `.env`).
3. **`bridge`**: puente por suscripción tipo OpenClaw (autenticación de mi suscripción de ChatGPT/Codex). Si su implementación no es viable de forma fiable, deja la interfaz preparada y un documento `docs/bridge.md` explicando cómo conectarlo; no bloquees el resto por esto.

Capacidades que la app pide al adaptador:
- **Clasificar** texto libre → entrada tipada (tipo + payload + tags). Si la confianza es baja, la entrada cae al inbox como "sin clasificar" para revisión manual.
- **Chat** con acceso a consultas sobre la BD (búsqueda por tipo, tags, fechas, texto).
- **Generar**: cierre del día (2-3 preguntas según lo registrado hoy), briefing matinal, informe mensual, revisión semanal guiada.
- **Mantener el perfil vivo**: tras cada análisis, actualizar el documento-perfil (guardando versión anterior).

**REGLA DURA de privacidad (principio 5 de biziye.md): ninguna entrada con `visible_ia = false` puede salir hacia ningún proveedor, ni en clasificación, ni en chat, ni en análisis.** El filtrado ocurre en la capa de datos, no en el prompt. Escribe tests que lo demuestren. La IA además debe poder apagarse del todo en Ajustes y la app entera sigue funcionando.

## Pantallas y navegación

Barra inferior fija con 5 elementos: **Hoy · Timeline · [+] · Chat · Apartados** (detalle completo en biziye.md).

1. **Hoy**: saludo, briefing (tareas pendientes, avisos próximos, resumen IA si está activa), métricas de 1 toque si faltan hoy (ánimo/energía/sueño, escala 1-5), y una píldora del pasado ("tal día como hoy" / frase guardada / chiste guardado).
2. **[+] (botón central destacado)**: captura en ≤2 toques. Campo de texto libre + botón de micrófono (Web Speech API) + selector rápido de tipo opcional. Con IA activa, clasifica sola; sin IA o sin confianza, va al inbox.
3. **Chat**: conversación con la IA — consultar y capturar. Historial de conversaciones. Si la IA está apagada, la pestaña lo explica con gracia.
4. **Timeline**: todas las entradas en orden cronológico, scroll infinito, filtros por tipo/tag/fecha y buscador de texto.
5. **Apartados**: rejilla de módulos, cada uno con su vista propia. Incluye acceso a **Ajustes**: privacidad IA (interruptores por apartado y proveedor activo), notificaciones, backups, exportación completa (JSON), cambio de contraseña.

Cada pantalla debe tener **estado vacío cuidado** (qué es, para qué sirve, botón de primera acción) — la app tiene que enseñarme a usarla sola.

## Alcance funcional v1 (todo esto, completo y funcionando)

**Captura y base:** entrada universal · tipos: nota, fallo (con disparador/situación), logro, tarea, gasto, métrica diaria, frase, chiste, primera vez · inbox de sin-clasificar · voz · timeline + buscador · soft delete y edición.

**Tareas:** lista simple con hecho/pendiente + recordatorio opcional. Sin proyectos, sin subtareas.

**IA:** chat general · clasificación automática · cierre del día · briefing matinal · revisión semanal guiada · informe mensual · perfil vivo (legible y editable en Apartados) · interruptores de privacidad.

**Vida práctica:** suscripciones (precio, renovación, aviso antes del cobro, coste anual total, "¿sigues usándola?") · vencimientos vitales (DNI, ITV, seguros... con antelación configurable) · préstamos personales · lista de deseos con enfriamiento de 30 días · motor de recordatorios con Web Push.

**Cine y series:** pendientes (con quién lo recomendó) · visto con nota 1-10 y fecha · ranking personal · estadísticas (por género, por año, por recomendador) · "¿qué veo esta noche?" vía chat.

**Anti-abandono:** si llevo ≥14 días sin registrar nada, notificación de reenganche con tono borde y humor negro (varias variantes rotatorias, estilo "eres una mierda, vuelve" — sí, en serio, está decidido así en biziye.md).

**Fuera de alcance v1 (NO lo construyas):** modo crisis, rueda de la vida, tipos personalizados por UI, dashboards configurables, importadores externos (calendario incluido — deja el hueco en el briefing), cartas al futuro, CRM, multi-usuario en UI, almacenamiento de fotos/vídeos (solo se guardan URLs/referencias como texto).

## Diseño (tan importante como el código)

- **Mobile-first** real: se diseña para el pulgar y luego se adapta a escritorio.
- **Identidad propia**: BIZIYE viene de "bizi" (vivir, en euskera). Quiero una estética con carácter — cálida, personal, ligeramente atrevida — no una plantilla genérica de dashboard ni Material/Bootstrap por defecto. Define un pequeño sistema de diseño (paleta con modo oscuro y claro, tipografía, espaciados, componentes base) y sé consistente.
- **Modo oscuro y claro**, respetando la preferencia del sistema.
- **Rápida y fluida**: transiciones sutiles, respuesta inmediata (optimistic UI en la captura), esqueletos de carga.
- Las estadísticas (cine, dinero) con gráficas sobrias y legibles en móvil.
- Accesible: contraste suficiente, áreas táctiles ≥44px, funciona con una mano.

## Criterios de aceptación — verifícalos TÚ antes de darlo por terminado

- [ ] `docker compose up` + `npm run dev` levantan todo en local a la primera, con un `seed` opcional de datos de demostración realistas.
- [ ] La PWA se instala (manifest válido, service worker activo) y la captura funciona sin conexión, sincronizando al volver.
- [ ] Puedo capturar una entrada en ≤2 toques desde cualquier pantalla.
- [ ] El flujo completo funciona con IA en `mock`: capturar → clasificar → ver en timeline → chat → cierre del día → informe.
- [ ] Ninguna entrada `visible_ia=false` llega al proveedor de IA (test automatizado que lo demuestra).
- [ ] El motor de recordatorios dispara notificaciones push reales (probado en local).
- [ ] Suscripciones muestra el coste anual total correcto; deseos respeta los 30 días; cine calcula el ranking bien.
- [ ] Exportación completa en JSON descargable desde Ajustes.
- [ ] Tests de la lógica de negocio (motor de recordatorios, filtro de privacidad, clasificación mock, cálculos de dinero) en verde.
- [ ] README con: arranque local, despliegue Hetzner paso a paso, configuración de cada backend de IA, y restauración de un backup (probada la instrucción, no solo escrita).
- [ ] Cero errores en consola del navegador en uso normal.
- [ ] La app entera es usable y bonita en un móvil Android real de gama media.
