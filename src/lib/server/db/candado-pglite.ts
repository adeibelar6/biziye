import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

/**
 * PGlite no protege su directorio de datos: si dos procesos lo abren a la vez
 * (p. ej. `npm run dev` y `npm run preview`), se corrompe. Este candado con el
 * PID del proceso lo impide y explica qué hacer en vez de romper datos.
 */
export function bloquearDirectorioPglite(directorio: string): void {
	const rutaCandado = directorio.replace(/[\\/]+$/, '') + '.lock';

	if (existsSync(rutaCandado)) {
		const pidAjeno = Number(readFileSync(rutaCandado, 'utf8').trim());
		if (pidAjeno && pidAjeno !== process.pid && procesoVivo(pidAjeno)) {
			throw new Error(
				`La base de datos embebida (${directorio}) ya está abierta por otro proceso ` +
					`(PID ${pidAjeno}). Cierra ese proceso (¿dev y preview a la vez?) o usa ` +
					`PostgreSQL con DATABASE_URL para tener varios procesos.`
			);
		}
		// Candado huérfano de un proceso muerto: se retira.
		rmSync(rutaCandado, { force: true });
	}

	writeFileSync(rutaCandado, String(process.pid));

	const soltar = () => {
		try {
			if (
				existsSync(rutaCandado) &&
				readFileSync(rutaCandado, 'utf8').trim() === String(process.pid)
			) {
				rmSync(rutaCandado, { force: true });
			}
		} catch {
			// Al salir no hay nada mejor que hacer.
		}
	};
	process.once('exit', soltar);
	process.once('SIGINT', () => {
		soltar();
		process.exit(130);
	});
	process.once('SIGTERM', () => {
		soltar();
		process.exit(143);
	});
}

function procesoVivo(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}
