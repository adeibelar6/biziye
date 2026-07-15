/**
 * Cálculo puro de recurrencias y avisos. Compartido entre el motor de
 * recordatorios (servidor) y las vistas (cliente): mismas cuentas en
 * los dos lados, tests en src/lib/server/recordatorios/motor.test.ts.
 */

export type Regla = 'unica' | 'diaria' | 'semanal' | 'mensual' | 'trimestral' | 'anual';

export const ENFRIAMIENTO_DIAS = 30;
export const HORA_AVISO = 9;

const MESES_POR_REGLA: Partial<Record<Regla, number>> = {
	mensual: 1,
	trimestral: 3,
	anual: 12
};

/**
 * Avanza una fecha un periodo según la regla, conservando el día del mes
 * cuando es posible (31 de enero + 1 mes = 28/29 de febrero, no 3 de marzo).
 */
export function avanzarPeriodo(fecha: Date, regla: Regla): Date {
	const siguiente = new Date(fecha);
	if (regla === 'diaria') {
		siguiente.setDate(siguiente.getDate() + 1);
		return siguiente;
	}
	if (regla === 'semanal') {
		siguiente.setDate(siguiente.getDate() + 7);
		return siguiente;
	}
	const meses = MESES_POR_REGLA[regla];
	if (!meses) return siguiente; // 'unica' no avanza
	const diaOriginal = fecha.getDate();
	siguiente.setDate(1);
	siguiente.setMonth(siguiente.getMonth() + meses);
	const ultimoDia = new Date(siguiente.getFullYear(), siguiente.getMonth() + 1, 0).getDate();
	siguiente.setDate(Math.min(diaOriginal, ultimoDia));
	return siguiente;
}

/** Instante del aviso: `antelacionDias` antes del objetivo, a las 09:00. */
export function instanteAviso(fechaObjetivo: Date, antelacionDias: number): Date {
	const aviso = new Date(fechaObjetivo);
	aviso.setDate(aviso.getDate() - Math.max(0, antelacionDias));
	aviso.setHours(HORA_AVISO, 0, 0, 0);
	return aviso;
}

/**
 * Próximo (fechaObjetivo, proximoAviso) estrictamente futuro. Para reglas
 * recurrentes avanza periodos hasta salir del pasado; para 'unica' devuelve
 * null si el aviso ya quedó atrás (no hay nada que programar).
 */
export function siguienteAviso(
	fechaObjetivo: Date,
	regla: Regla,
	antelacionDias: number,
	ahora: Date = new Date()
): { fechaObjetivo: Date; proximoAviso: Date } | null {
	let objetivo = new Date(fechaObjetivo);
	let aviso = instanteAviso(objetivo, antelacionDias);
	if (regla === 'unica') {
		return aviso > ahora ? { fechaObjetivo: objetivo, proximoAviso: aviso } : null;
	}
	// Tope defensivo: nada razonable necesita más de 400 saltos (>1 año diario).
	for (let i = 0; aviso <= ahora && i < 400; i++) {
		objetivo = avanzarPeriodo(objetivo, regla);
		aviso = instanteAviso(objetivo, antelacionDias);
	}
	return aviso > ahora ? { fechaObjetivo: objetivo, proximoAviso: aviso } : null;
}

/** Fin del enfriamiento de un deseo: 30 días después de apuntarlo, a las 09:00. */
export function finDeEnfriamiento(creado: Date): Date {
	const fin = new Date(creado);
	fin.setDate(fin.getDate() + ENFRIAMIENTO_DIAS);
	fin.setHours(HORA_AVISO, 0, 0, 0);
	return fin;
}
