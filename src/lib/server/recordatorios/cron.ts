import { dev } from '$app/environment';

/**
 * Cron interno de BIZIYE: un tic por minuto evalúa los "evaluadores"
 * registrados (motor de recordatorios, reenganche anti-abandono…).
 * Cada evaluador es idempotente: puede ejecutarse de más sin duplicar avisos.
 */

export type Evaluador = { nombre: string; ejecutar: () => Promise<void> };

const almacenGlobal = globalThis as unknown as {
	__biziyeCron?: ReturnType<typeof setInterval>;
	__biziyeEvaluadores?: Evaluador[];
};

const evaluadores: Evaluador[] = (almacenGlobal.__biziyeEvaluadores ??= []);

export function registrarEvaluador(evaluador: Evaluador) {
	if (!evaluadores.some((e) => e.nombre === evaluador.nombre)) {
		evaluadores.push(evaluador);
	}
}

const CADA_MINUTO = 60_000;

async function tic() {
	for (const evaluador of evaluadores) {
		try {
			await evaluador.ejecutar();
		} catch (error) {
			console.error(`[cron] El evaluador «${evaluador.nombre}» falló:`, error);
		}
	}
}

export function iniciarCron() {
	// Guardia para el HMR de dev: un solo intervalo vivo por proceso.
	if (almacenGlobal.__biziyeCron) {
		clearInterval(almacenGlobal.__biziyeCron);
	}
	almacenGlobal.__biziyeCron = setInterval(tic, CADA_MINUTO);
	// Primer tic poco después de arrancar, para no esperar un minuto en frío.
	setTimeout(() => void tic(), dev ? 5_000 : 15_000);
}
