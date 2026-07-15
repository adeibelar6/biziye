/** Utilidades de fecha de BIZIYE. La app vive en Europe/Madrid. */

export const ZONA = 'Europe/Madrid';

/** Día local (YYYY-MM-DD) de un instante, en la zona de la app. */
export function diaLocal(instante: Date = new Date(), zona: string = ZONA): string {
	return new Intl.DateTimeFormat('sv-SE', {
		timeZone: zona,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(instante);
}

/** Hora local (0-23) de un instante. */
export function horaLocal(instante: Date = new Date(), zona: string = ZONA): number {
	return Number(
		new Intl.DateTimeFormat('es-ES', { timeZone: zona, hour: 'numeric', hour12: false }).format(
			instante
		)
	);
}

/** «martes, 15 de julio» */
export function fechaLarga(instante: Date = new Date(), zona: string = ZONA): string {
	return new Intl.DateTimeFormat('es-ES', {
		timeZone: zona,
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(instante);
}

/** «15 jul 2026» */
export function fechaCorta(instante: Date, zona: string = ZONA): string {
	return new Intl.DateTimeFormat('es-ES', {
		timeZone: zona,
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(instante);
}

/** «14:35» */
export function horaCorta(instante: Date, zona: string = ZONA): string {
	return new Intl.DateTimeFormat('es-ES', {
		timeZone: zona,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(instante);
}

/** Día de la semana en minúsculas («lunes»…), para el contexto de entradas. */
export function diaSemana(instante: Date = new Date(), zona: string = ZONA): string {
	return new Intl.DateTimeFormat('es-ES', { timeZone: zona, weekday: 'long' }).format(instante);
}

export function saludoSegunHora(hora: number): string {
	if (hora >= 6 && hora < 13) return 'Egun on';
	if (hora >= 13 && hora < 21) return 'Arratsalde on';
	return 'Gabon';
}

/** Fecha relativa corta: «hoy», «ayer», «hace 3 días», o fecha corta si es lejos. */
export function fechaRelativa(instante: Date, ahora: Date = new Date(), zona: string = ZONA): string {
	const dia = diaLocal(instante, zona);
	const diaHoy = diaLocal(ahora, zona);
	if (dia === diaHoy) return 'hoy';
	const unDia = 24 * 60 * 60 * 1000;
	const diferenciaDias = Math.round(
		(Date.parse(diaHoy + 'T12:00:00Z') - Date.parse(dia + 'T12:00:00Z')) / unDia
	);
	if (diferenciaDias === 1) return 'ayer';
	if (diferenciaDias > 1 && diferenciaDias < 7) return `hace ${diferenciaDias} días`;
	if (diferenciaDias === -1) return 'mañana';
	if (diferenciaDias < -1 && diferenciaDias > -7) return `en ${-diferenciaDias} días`;
	return fechaCorta(instante, zona);
}

/** Días (enteros, por día natural local) desde `a` hasta `b`. Positivo si b es después. */
export function diasEntre(a: Date, b: Date, zona: string = ZONA): number {
	const unDia = 24 * 60 * 60 * 1000;
	return Math.round(
		(Date.parse(diaLocal(b, zona) + 'T12:00:00Z') - Date.parse(diaLocal(a, zona) + 'T12:00:00Z')) /
			unDia
	);
}
