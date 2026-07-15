# BIZIYE

Tu vida, apuntada y con respuesta. Una PWA personal (usuario único) donde
registras todo — fallos, logros, gastos, métricas, cine, tareas, frases… — y
una capa de IA lo clasifica, lo analiza y te lo devuelve: chat, cierre del
día, briefing matinal, revisión semanal, informe mensual y un perfil vivo.

La visión de producto está en [`biziye.md`](biziye.md); las decisiones
técnicas y su porqué, en [`DECISIONES.md`](DECISIONES.md).

## Arranque en local

Requisitos: Node 20+ (Docker es opcional).

```bash
npm install
npm run dev
```

Ya está. Sin nada más configurado, la app usa **PGlite** (PostgreSQL embebido,
datos en `./data/pglite`), aplica las migraciones al arrancar y usa el
proveedor de IA **mock** (heurísticas deterministas, sin claves). La primera
pantalla te pide crear tu contraseña.

> **Proyecto en OneDrive/Dropbox:** apunta la BD fuera de la carpeta
> sincronizada — en `.env`, `PGLITE_DIR=C:\Users\tu\AppData\Local\biziye\pglite`.
> La sincronización bloquea archivos y puede corromper una BD embebida.

¿Prefieres PostgreSQL de verdad en dev?

```bash
docker compose up -d          # levanta postgres:17 en el puerto 5432
# y en .env: DATABASE_URL=postgres://biziye:biziye@localhost:5432/biziye
```

Datos de demostración (opcional, solo si la BD está vacía):

```bash
npm run seed                  # crea el usuario «Demo» (contraseña: demo1234)
```

Otras órdenes: `npm test` (vitest), `npm run check` (svelte-check),
`npm run db:generar` / `db:migrar` (Drizzle), `npm run generar-iconos`.

### La PWA (instalación y offline)

El service worker no corre en `vite dev`. Para probar instalación, offline y
notificaciones en local:

```bash
npm run build && npm run preview
```

La captura sin conexión se encola en IndexedDB y se sincroniza sola al volver
la red (o al abrir la app).

## Configurar la IA

Se elige por `.env` con `IA_PROVEEDOR`:

| Valor    | Qué es | Qué necesitas |
|----------|--------|----------------|
| `mock`   | Heurísticas locales deterministas. Toda la app funciona sin red ni claves. | Nada (por defecto) |
| `openai` | API oficial de OpenAI (protocolo `/chat/completions`, sin SDK). | `OPENAI_API_KEY` (y opcional `OPENAI_MODELO`, por defecto `gpt-4o-mini`) |
| `bridge` | Cualquier proxy OpenAI-compatible que use tu suscripción por detrás (OpenClaw, LiteLLM…). | `BRIDGE_URL` y `BRIDGE_TOKEN` — detalle en [`docs/bridge.md`](docs/bridge.md) |

Privacidad, en dos capas que no dependen del proveedor:

- El interruptor **IA sí/no** de Ajustes apaga TODO (chat, clasificación,
  cierres, informes) y la app entera sigue funcionando.
- Ninguna entrada con `visible_ia = false` — ni de un apartado marcado como
  oculto en Ajustes — sale jamás hacia ningún proveedor. El filtro vive en la
  consulta SQL (`src/lib/server/ia/datos.ts`), no en los prompts, y hay tests
  que lo demuestran (`privacidad.test.ts`, `generar.test.ts`).

## Notificaciones (Web Push)

```bash
npm run generar-vapid         # genera las claves y las escribe en .env
```

Reinicia la app, entra en **Ajustes → Notificaciones → Activar avisos aquí**
(desde la app instalada o `npm run preview`; el navegador pedirá permiso) y
prueba con «Probar aviso». Sin claves VAPID los avisos del motor de
recordatorios se escriben en el log del servidor y no se pierde nada más.

Avisan: renovaciones de suscripciones, vencimientos (con su antelación),
tareas con fecha, deseos que terminan el enfriamiento de 30 días, y el
reenganche anti-abandono a los 14 días sin registrar (con cariño y mala
leche, como está mandado).

## Despliegue en un VPS (Hetzner, Ubuntu)

Pasos completos partiendo de un VPS recién creado (CX22 sobra) y un dominio.

1. **DNS**: crea un registro `A` de `biziye.tudominio.es` a la IP del VPS.

2. **Preparar el servidor** (como root):

   ```bash
   apt update && apt upgrade -y
   apt install -y docker.io docker-compose-v2 git ufw
   ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
   ```

3. **Traer el código**:

   ```bash
   git clone <tu-repo> /opt/biziye && cd /opt/biziye
   ```

4. **Configurar**:

   ```bash
   cp .env.prod.example .env.prod
   nano .env.prod    # DOMINIO, DB_PASSWORD larga, IA_PROVEEDOR y sus claves
   ```

   Para las claves VAPID puedes ejecutar `npm run generar-vapid` en tu máquina
   y pegar las dos líneas en `.env.prod`.

5. **Levantar**:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

   Eso arranca: la app (Node), PostgreSQL 17, **Caddy** (HTTPS automático con
   Let's Encrypt para `DOMINIO`) y el servicio de **backup** diario.

6. **Primer arranque**: abre `https://biziye.tudominio.es`, crea tu contraseña,
   instala la PWA desde el navegador del móvil (Chrome/Android: «Añadir a
   pantalla de inicio») y activa las notificaciones en Ajustes.

Actualizar a una versión nueva:

```bash
cd /opt/biziye && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Backups y restauración

El servicio `backup` hace `pg_dump | gzip` **cada 24 h** a `./backups` del
host y borra los que superen `BACKUP_DIAS_RETENCION` (30 días por defecto).

**Restaurar un backup** (en el VPS, sobre la BD del compose):

```bash
cd /opt/biziye
docker compose -f docker-compose.prod.yml --env-file .env.prod stop app
gunzip -c backups/biziye_2026-07-15_0300.sql.gz \
  | docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
    psql -U biziye -d biziye
docker compose -f docker-compose.prod.yml --env-file .env.prod start app
```

> Si restauras sobre una BD con datos (no vacía), recréala antes para no
> mezclar: `exec -T db psql -U biziye -d postgres -c "drop database biziye;
> create database biziye;"` y después el `gunzip | psql` de arriba.
>
> Nota: en la máquina donde se construyó esto no hay Docker, así que esta
> instrucción está verificada contra la sintaxis de pg_dump/psql 17 pero no
> ejecutada de punta a punta. Pruébala una vez en el VPS antes de necesitarla
> de verdad — un backup sin restauración ensayada es una esperanza, no un plan.

**Copia fuera del servidor** (recomendado, paso manual): apunta cualquier
herramienta al directorio `./backups`, por ejemplo con rclone:

```bash
apt install -y rclone && rclone config    # una vez, p. ej. destino B2/Drive
crontab -e                                # y añade:
30 4 * * * rclone copy /opt/biziye/backups remoto:biziye-backups --max-age 48h
```

La **exportación completa en JSON** (todo lo tuyo, también lo borrado) se
descarga desde Ajustes → Tus datos, sin tocar el servidor.

## Mapa del proyecto

```
src/lib/tipos/            registro central de tipos de entrada (añadir tipo = una definición)
src/lib/server/entradas.ts  capa de datos de la entrada universal (toda escritura pasa por aquí)
src/lib/server/ia/        adaptador de IA: mock | openai | bridge + filtro de privacidad
src/lib/server/recordatorios/  cron interno, motor de avisos, anti-abandono
src/routes/               Hoy · Timeline · [+] · Chat · Apartados (SvelteKit)
scripts/                  migrar, seed, iconos, claves VAPID
deploy/                   Caddyfile y backup.sh de producción
```
