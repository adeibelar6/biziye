import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Carga .env en process.env para los scripts sueltos (migrar, seed, vapid). */
export function cargarEnv() {
	const ruta = fileURLToPath(new URL('../.env', import.meta.url));
	if (!existsSync(ruta)) return;
	for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
		const limpia = linea.trim();
		if (!limpia || limpia.startsWith('#')) continue;
		const separador = limpia.indexOf('=');
		if (separador === -1) continue;
		const clave = limpia.slice(0, separador).trim();
		const valor = limpia.slice(separador + 1).trim();
		if (!(clave in process.env)) process.env[clave] = valor;
	}
}

/**
 * Abre PGlite en el directorio configurado (PGLITE_DIR o data/pglite) con el
 * mismo candado anti doble-apertura que usa la app. Devuelve el cliente.
 */
export async function abrirPglite() {
	const { PGlite } = await import('@electric-sql/pglite');
	const directorio = process.env.PGLITE_DIR || 'data/pglite';
	mkdirSync(directorio, { recursive: true });

	const rutaCandado = directorio.replace(/[\\/]+$/, '') + '.lock';
	if (existsSync(rutaCandado)) {
		const pidAjeno = Number(readFileSync(rutaCandado, 'utf8').trim());
		let vivo = false;
		try {
			process.kill(pidAjeno, 0);
			vivo = true;
		} catch {
			vivo = false;
		}
		if (pidAjeno && vivo) {
			console.error(
				`La BD embebida (${directorio}) está abierta por otro proceso (PID ${pidAjeno}).` +
					' Para el servidor de dev antes de ejecutar este script.'
			);
			process.exit(1);
		}
		rmSync(rutaCandado, { force: true });
	}
	writeFileSync(rutaCandado, String(process.pid));
	process.once('exit', () => {
		try {
			rmSync(rutaCandado, { force: true });
		} catch {
			/* nada */
		}
	});

	return new PGlite(directorio);
}
