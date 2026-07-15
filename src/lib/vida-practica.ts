import { avanzarPeriodo, ENFRIAMIENTO_DIAS, type Regla } from '$lib/recurrencias';
import { diasEntre } from '$lib/fechas';
import type { Payload } from '$lib/tipos';

/**
 * Cuentas puras de los módulos de vida práctica (suscripciones, deseos,
 * préstamos). Compartidas entre servidor y cliente; tests en
 * vida-practica.test.ts.
 */

export type Periodicidad = 'mensual' | 'trimestral' | 'anual';

const PAGOS_AL_ANIO: Record<Periodicidad, number> = {
	mensual: 12,
	trimestral: 4,
	anual: 1
};

export function periodicidadDe(payload: Payload): Periodicidad {
	const valor = payload.periodicidad;
	return valor === 'trimestral' || valor === 'anual' ? valor : 'mensual';
}

/** Lo que cuesta una suscripción al año. */
export function costeAnual(precio: number, periodicidad: Periodicidad): number {
	if (!Number.isFinite(precio) || precio < 0) return 0;
	return precio * PAGOS_AL_ANIO[periodicidad];
}

/** Coste anual total de una lista de suscripciones activas. */
export function costeAnualTotal(suscripciones: Payload[]): number {
	return suscripciones
		.filter((s) => s.activa !== false)
		.reduce((total, s) => total + costeAnual(Number(s.precio) || 0, periodicidadDe(s)), 0);
}

/**
 * Próxima renovación real: la fecha guardada, avanzada de periodo en periodo
 * hasta hoy o más allá (la fecha del payload no se reescribe sola; la vista
 * enseña siempre la próxima de verdad).
 */
export function proximaRenovacionEfectiva(
	payload: Payload,
	ahora: Date = new Date()
): Date | null {
	const bruto = payload.proxima_renovacion;
	if (typeof bruto !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(bruto)) return null;
	let fecha = new Date(`${bruto.slice(0, 10)}T12:00:00`);
	if (Number.isNaN(fecha.getTime())) return null;
	const regla: Regla = periodicidadDe(payload);
	for (let i = 0; diasEntre(ahora, fecha) < 0 && i < 400; i++) {
		fecha = avanzarPeriodo(fecha, regla);
	}
	return fecha;
}

/** Días de enfriamiento que le quedan a un deseo (0 = ya puede decidirse). */
export function diasDeEnfriamientoRestantes(creado: Date, ahora: Date = new Date()): number {
	return Math.max(0, ENFRIAMIENTO_DIAS - diasEntre(creado, ahora));
}

/**
 * Estado efectivo de un deseo: si sigue marcado «enfriando» pero los 30 días
 * ya pasaron, para la vista está «disponible» (el cron lo persistirá solo).
 */
export function estadoEfectivoDeseo(payload: Payload, creado: Date, ahora: Date = new Date()) {
	const estado = typeof payload.estado === 'string' ? payload.estado : 'enfriando';
	if (estado === 'enfriando' && diasDeEnfriamientoRestantes(creado, ahora) === 0) {
		return 'disponible';
	}
	return estado;
}

/** Saldos de préstamos sin devolver: por persona y neto (+ me deben, − debo). */
export function saldosPrestamos(prestamos: Payload[]): {
	porPersona: { persona: string; saldo: number }[];
	neto: number;
} {
	const mapa = new Map<string, number>();
	for (const p of prestamos) {
		if (p.devuelto === true) continue;
		const importe = Number(p.importe) || 0;
		const persona = String(p.persona ?? '').trim() || '¿?';
		const signo = p.direccion === 'me_prestaron' ? -1 : 1;
		mapa.set(persona, (mapa.get(persona) ?? 0) + signo * importe);
	}
	const porPersona = [...mapa.entries()]
		.map(([persona, saldo]) => ({ persona, saldo }))
		.sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
	return { porPersona, neto: porPersona.reduce((total, p) => total + p.saldo, 0) };
}
