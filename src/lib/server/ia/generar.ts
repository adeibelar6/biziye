import { entradasParaIA } from './datos';
import { proveedorIA } from './index';
import { diaLocal } from '$lib/fechas';
import type { Payload } from '$lib/tipos';

/**
 * Generaciones de la IA (cierre del día, briefing, informe, revisión).
 * Los datos que se envían al proveedor salen SIEMPRE de entradasParaIA
 * (filtro de privacidad en la capa de datos).
 */

function textoDe(payload: Payload, clave = 'texto'): string {
	return String(payload[clave] ?? '');
}

/** Datos del día (solo lo visible para la IA) para generar el cierre. */
export async function construirDatosCierre(userId: string, ahora = new Date()) {
	const inicioDia = new Date(`${diaLocal(ahora)}T00:00:00`);
	const entradas = await entradasParaIA(userId, { desde: inicioDia, limite: 100 });

	const fallos = entradas.filter((e) => e.tipo === 'fallo').map((e) => textoDe(e.payload));
	const logros = entradas.filter((e) => e.tipo === 'logro').map((e) => textoDe(e.payload));
	const gastoTotal = entradas
		.filter((e) => e.tipo === 'gasto')
		.reduce((suma, e) => suma + (Number(e.payload.importe) || 0), 0);
	const metrica = entradas.find((e) => e.tipo === 'metrica');
	const tareasHechas = entradas.filter(
		(e) => e.tipo === 'tarea' && e.payload.hecha === true
	).length;

	return {
		fecha: diaLocal(ahora),
		totalEntradas: entradas.length,
		fallos,
		logros,
		gastoTotal,
		animo: metrica ? Number(metrica.payload.animo) || undefined : undefined,
		tareasHechas
	};
}

/** Preguntas del cierre del día, o null si la IA está apagada. */
export async function generarCierreDelDia(userId: string): Promise<string[] | null> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) return null;

	const datos = await construirDatosCierre(userId);
	const texto = await proveedor.generar('cierre_dia', JSON.stringify(datos));
	return texto
		.split('\n')
		.map((linea) => linea.replace(/^[-*\d.\s]+/, '').trim())
		.filter(Boolean)
		.slice(0, 3);
}
