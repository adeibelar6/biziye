#!/bin/sh
# Backup diario de la BD de BIZIYE con rotación.
# Corre dentro del contenedor `backup` (ver docker-compose.prod.yml).
# Los dumps quedan en ./backups del host; desde ahí puedes copiarlos fuera
# del servidor (rclone, rsync, restic…) — ver README, sección Backups.

set -eu

DIAS_RETENCION="${DIAS_RETENCION:-30}"

echo "[backup] Servicio de backup iniciado (retención: ${DIAS_RETENCION} días)"

while true; do
  FECHA="$(date +%Y-%m-%d_%H%M)"
  DESTINO="/backups/biziye_${FECHA}.sql.gz"

  if pg_dump -h db -U biziye -d biziye | gzip > "${DESTINO}"; then
    echo "[backup] OK ${DESTINO} ($(du -h "${DESTINO}" | cut -f1))"
  else
    echo "[backup] ERROR al crear ${DESTINO}" >&2
    rm -f "${DESTINO}"
  fi

  # Rotación: borra dumps más viejos que la retención.
  find /backups -name 'biziye_*.sql.gz' -mtime "+${DIAS_RETENCION}" -delete

  # Espera 24 horas hasta el siguiente.
  sleep 86400
done
