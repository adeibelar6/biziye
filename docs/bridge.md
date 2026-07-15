# Puente por suscripción (`IA_PROVEEDOR=bridge`)

## Qué es

La vía principal de IA decidida en `biziye.md` es usar la autenticación de tu
suscripción de ChatGPT (estilo OpenClaw/Codex) en vez de pagar la API por uso.
Es zona gris de los términos de servicio (asumida: uso personal, una sola
cuenta) y **puede romperse cuando OpenAI cambie la autenticación**.

## Cómo está montado en BIZIYE

BIZIYE no implementa el protocolo propietario de autenticación de ChatGPT
(cambia a menudo y romperse silenciosamente sería peor que no estar). En su
lugar, el backend `bridge` habla el **protocolo estándar de OpenAI
(`/chat/completions`)** contra la URL que le digas:

```env
IA_PROVEEDOR=bridge
BRIDGE_URL=http://localhost:8787/v1
BRIDGE_TOKEN=lo-que-pida-tu-puente
```

Es decir: cualquier proceso que exponga una API compatible con OpenAI y por
detrás use tu suscripción, enchufa aquí sin tocar ni una línea de la app.

## Opciones concretas para levantar ese puente

1. **OpenClaw / Codex proxy** — el proyecto tipo OpenClaw expone un endpoint
   compatible con OpenAI autenticado con tu cuenta de ChatGPT. Instálalo en el
   mismo VPS, apunta `BRIDGE_URL` a él y listo.
2. **LiteLLM proxy** (`pip install litellm[proxy]`) — hace de pasarela
   OpenAI-compatible hacia decenas de backends; útil si mañana quieres Claude
   u Ollama detrás del mismo enchufe.
3. **Cualquier otro** que hable `/v1/chat/completions`.

## Si el puente se rompe (plan B de biziye.md)

Cambia dos líneas del `.env` y reinicia:

```env
IA_PROVEEDOR=openai
OPENAI_API_KEY=sk-…
```

Mismo adaptador, misma app; solo cambia la configuración. Y si un día quieres
volver: `IA_PROVEEDOR=bridge`.

## Por qué así y no una implementación propia del login de ChatGPT

- La autenticación de la suscripción cambia sin aviso; un puente mantenido por
  una comunidad (OpenClaw, LiteLLM) se actualiza; código propio aquí, no.
- La interfaz `ProveedorIA` de la app queda agnóstica de verdad: mock, OpenAI
  y bridge son intercambiables por `.env`, que era el requisito.
