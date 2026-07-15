---
name: verify
description: Cómo verificar BIZIYE en marcha — arranque con BD limpia, login y recorrido de flujos por HTTP.
---

# Verificar BIZIYE

## Arranque con BD desechable (no toca los datos reales)

```powershell
$env:PGLITE_DIR = '<scratchpad>\pglite-verif'   # BD PGlite limpia
$env:IA_PROVEEDOR = 'mock'
npm run dev
```

- Si el 5173 está ocupado, Vite salta al 5174 — **mira el log para saber el puerto real** antes de lanzar peticiones.
- PGlite tiene candado anti doble-apertura por directorio de datos; una BD scratch nunca choca con la real.
- El service worker no corre en `vite dev`; la PWA se prueba con `npm run build && npm run preview`.

## Login (usuario único, primera vez crea la cuenta)

```powershell
curl.exe -s -i -X POST 'http://localhost:PUERTO/login?/crear' -H 'Origin: http://localhost:PUERTO' `
  --data-urlencode 'nombre=Verificador' --data-urlencode 'contrasena=verificacion123' --data-urlencode 'repetida=verificacion123'
```

Captura `set-cookie: biziye_sesion=...` y mándala como `Cookie: biziye_sesion=<valor>` en todo lo demás.
Las form actions de SvelteKit (`?/accion`) exigen cabecera `Origin` correcta (CSRF); las API JSON no.

## Flujos que merece la pena recorrer

- `POST /api/capturar` con `{"texto":"..."}` sin tipo → `destino` = `clasificada` (mock clasifica gasto/peli/tarea…) o `inbox`.
- `POST /api/chat` con `{"texto":"¿cuánto he gastado este mes?"}` → responde con datos reales de la BD.
- Privacidad: `POST /apartados/ajustes?/ia` con `activa=on` + `oculto=<tipo>` → el chat deja de encontrar entradas de ese tipo y las nuevas nacen `visibleIa=false`.
- IA apagada (`?/ia` sin `activa`): captura libre → inbox, `/api/chat` → 409 `ia_apagada`, la página `/chat` lo explica.
- Cierre: `GET /cierre` (preguntas), `POST /cierre?/guardar` con pares `pregunta`/`respuesta`. En «Hoy», `ofrecerCierre:true` a partir de las 19:00 con IA activa.

## Gotchas

- Cada llamada PowerShell es un proceso nuevo: guarda la cookie en un archivo del scratchpad.
- Las páginas SSR serializan los datos del load en el HTML — grep de `visibleIa:`, `ofrecerCierre:` etc. sirve como observación.
- El estado «cierre hecho» se deshace con `POST /entrada/<id>?/borrar` (soft delete).
