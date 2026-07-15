import type { Payload } from '$lib/tipos';

/**
 * Cuentas puras del módulo de cine y series: ranking y estadísticas.
 * Tests en cine.test.ts.
 */

export type Titulo = { id: string; payload: Payload; timestamp: Date };

export function esVista(payload: Payload): boolean {
	return payload.estado === 'vista';
}

function nota(payload: Payload): number | null {
	const valor = Number(payload.nota);
	return Number.isFinite(valor) && valor >= 1 && valor <= 10 ? valor : null;
}

/** Ranking personal: vistas con nota, de mejor a peor (empates: más reciente antes). */
export function ranking(titulos: Titulo[]): Titulo[] {
	return titulos
		.filter((t) => esVista(t.payload) && nota(t.payload) !== null)
		.sort((a, b) => {
			const diferencia = nota(b.payload)! - nota(a.payload)!;
			return diferencia !== 0 ? diferencia : b.timestamp.getTime() - a.timestamp.getTime();
		});
}

export type GrupoEstadistica = { clave: string; vistas: number; notaMedia: number | null };

function agrupar(titulos: Titulo[], claveDe: (p: Payload) => string): GrupoEstadistica[] {
	const grupos = new Map<string, { vistas: number; suma: number; conNota: number }>();
	for (const t of titulos) {
		if (!esVista(t.payload)) continue;
		const clave = claveDe(t.payload).trim() || 'sin dato';
		const grupo = grupos.get(clave) ?? { vistas: 0, suma: 0, conNota: 0 };
		grupo.vistas++;
		const n = nota(t.payload);
		if (n !== null) {
			grupo.suma += n;
			grupo.conNota++;
		}
		grupos.set(clave, grupo);
	}
	return [...grupos.entries()]
		.map(([clave, g]) => ({
			clave,
			vistas: g.vistas,
			notaMedia: g.conNota > 0 ? g.suma / g.conNota : null
		}))
		.sort((a, b) => b.vistas - a.vistas || (b.notaMedia ?? 0) - (a.notaMedia ?? 0));
}

export function estadisticasPorGenero(titulos: Titulo[]): GrupoEstadistica[] {
	return agrupar(titulos, (p) => String(p.genero ?? '').toLowerCase());
}

export function estadisticasPorAnio(titulos: Titulo[]): GrupoEstadistica[] {
	return agrupar(titulos, (p) => (Number(p.anio) ? String(p.anio) : 'sin dato'));
}

/**
 * Fiabilidad de recomendadores: cuántas de sus recomendaciones has visto,
 * con qué nota media, y cuántas siguen pendientes.
 */
export function recomendadores(
	titulos: Titulo[]
): { clave: string; vistas: number; notaMedia: number | null; pendientes: number }[] {
	const base = agrupar(
		titulos.filter((t) => String(t.payload.recomendador ?? '').trim()),
		(p) => String(p.recomendador ?? '')
	);
	const pendientesPor = new Map<string, number>();
	for (const t of titulos) {
		const quien = String(t.payload.recomendador ?? '').trim();
		if (!quien || esVista(t.payload)) continue;
		pendientesPor.set(quien, (pendientesPor.get(quien) ?? 0) + 1);
	}
	const resultado = base.map((g) => ({ ...g, pendientes: pendientesPor.get(g.clave) ?? 0 }));
	// Recomendadores de los que aún no has visto nada, pero te deben una noche.
	for (const [quien, pendientes] of pendientesPor) {
		if (!resultado.some((r) => r.clave === quien)) {
			resultado.push({ clave: quien, vistas: 0, notaMedia: null, pendientes });
		}
	}
	return resultado.sort(
		(a, b) => (b.notaMedia ?? -1) - (a.notaMedia ?? -1) || b.vistas - a.vistas
	);
}

export function notaMediaGlobal(titulos: Titulo[]): number | null {
	const notas = titulos
		.filter((t) => esVista(t.payload))
		.map((t) => nota(t.payload))
		.filter((n): n is number => n !== null);
	if (notas.length === 0) return null;
	return notas.reduce((suma, n) => suma + n, 0) / notas.length;
}
