import { configIA } from '$lib/server/config';
import { listarEntradas, type Entrada, type FiltrosEntradas } from '$lib/server/entradas';
import { resumenEntrada, type Payload } from '$lib/tipos';
import { fechaCorta, horaCorta } from '$lib/fechas';

/**
 * REGLA DURA DE PRIVACIDAD (principio 5 de biziye.md):
 * ninguna entrada con visible_ia = false, ni de un tipo apagado en Ajustes,
 * puede salir hacia ningún proveedor de IA. Ni en clasificación, ni en chat,
 * ni en análisis.
 *
 * Este módulo es la ÚNICA puerta por la que la capa de IA lee entradas.
 * El filtro se aplica aquí, en la consulta a la BD — no en los prompts.
 * Los tests de src/lib/server/ia/privacidad.test.ts lo demuestran.
 */

export type EntradaParaIA = {
	id: string;
	tipo: string;
	timestamp: Date;
	tags: string[];
	payload: Payload;
	resumen: string;
};

function sanear(entrada: Entrada): EntradaParaIA {
	return {
		id: entrada.id,
		tipo: entrada.tipo,
		timestamp: entrada.timestamp,
		tags: entrada.tags,
		payload: entrada.payload as Payload,
		resumen: resumenEntrada(entrada.tipo, entrada.payload as Payload)
	};
}

/**
 * Entradas que la IA puede ver: siempre visible_ia = true (forzado a nivel
 * de consulta SQL) y nunca de tipos ocultos por configuración.
 */
export async function entradasParaIA(
	userId: string,
	filtros: Omit<FiltrosEntradas, 'soloVisiblesIa'> = {}
): Promise<EntradaParaIA[]> {
	const config = await configIA(userId);

	// Si piden un tipo oculto explícitamente, la respuesta es vacía: punto.
	if (filtros.tipo && config.tiposOcultos.includes(filtros.tipo)) return [];

	const entradas = await listarEntradas(userId, {
		...filtros,
		soloVisiblesIa: true
	});

	return entradas.filter((e) => !config.tiposOcultos.includes(e.tipo)).map(sanear);
}

/** Línea de texto compacta para meter una entrada en un prompt. */
export function lineaParaIA(entrada: EntradaParaIA): string {
	const fecha = `${fechaCorta(entrada.timestamp)} ${horaCorta(entrada.timestamp)}`;
	const etiquetas = entrada.tags.length > 0 ? ` [${entrada.tags.join(', ')}]` : '';
	return `- (${entrada.tipo}, ${fecha}${etiquetas}) ${entrada.resumen}`;
}

export function bloqueParaIA(entradas: EntradaParaIA[]): string {
	if (entradas.length === 0) return '(sin entradas)';
	return entradas.map(lineaParaIA).join('\n');
}
