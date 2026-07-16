import { diaLocal } from '$lib/fechas';
import { definicion, type Payload } from './index';

/**
 * Construye el payload de un tipo a partir de texto libre (captura manual con
 * tipo elegido, y base del clasificador mock). Devuelve null si el tipo
 * necesita datos que no se pueden sacar del texto (irá al inbox).
 */

/** Primer número con aspecto de importe («12», «12,50», «12.50 €»). */
export function extraerImporte(texto: string): number | undefined {
	const coincidencia = texto.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur)?/i);
	if (!coincidencia) return undefined;
	const numero = Number(coincidencia[1].replace(',', '.'));
	return Number.isFinite(numero) ? numero : undefined;
}

const CATEGORIAS_GASTO: [RegExp, string][] = [
	[/\b(gasolin|diesel|parking|peaje|tren\b|bus\b|metro|taxi|uber|coche|itv\b|taller)/i, 'transporte'],
	[/\b(comid|cen[aá]|comer|restaurante|bar\b|bares\b|caf[eé]|desayun|pizz|men[uú]|super|mercadona|compra)/i, 'comida'],
	[/\b(luz\b|agua\b|gas\b|alquiler|hipoteca|internet|m[oó]vil|casa\b|mueble|ikea)/i, 'casa'],
	[/\b(cine\b|concierto|entrada|juego|ocio|cervez|copa|caña|fiesta|viaje|hotel)/i, 'ocio'],
	[/\b(m[eé]dic|farmaci|dentista|fisio|gimnasio|gym\b)/i, 'salud'],
	[/\b(ropa\b|zapat|camisa|pantal[oó]n|abrigo)/i, 'ropa'],
	[/\b(regalo|cumple)/i, 'regalos']
];

export function categoriaGasto(texto: string): string {
	for (const [patron, categoria] of CATEGORIAS_GASTO) {
		if (patron.test(texto)) return categoria;
	}
	return 'otros';
}

// ── Fechas, horas y eventos desde texto libre ────────────────────────────────

const DIAS_SEMANA: [RegExp, number][] = [
	[/\blunes\b/i, 1],
	[/\bmartes\b/i, 2],
	[/\bmi[eé]rcoles\b/i, 3],
	[/\bjueves\b/i, 4],
	[/\bviernes\b/i, 5],
	[/\bs[aá]bado\b/i, 6],
	[/\bdomingo\b/i, 0]
];

const MESES = [
	'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
	'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/** «a las 21», «a la 1», «21:30» → 'HH:MM'. Ignora importes («12:50 €»). */
export function extraerHora(texto: string): string | undefined {
	const coincidencia =
		texto.match(/\ba las?\s+(\d{1,2})(?:[:.h](\d{2}))?/i) ??
		texto.match(/\b(\d{1,2}):(\d{2})\b(?!\s*(?:€|euros?\b|eur\b))/);
	if (!coincidencia) return undefined;
	const horas = Number(coincidencia[1]);
	const minutos = coincidencia[2] ? Number(coincidencia[2]) : 0;
	if (horas > 23 || minutos > 59) return undefined;
	return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/**
 * Fecha 'YYYY-MM-DD' desde referencias relativas: «hoy», «mañana», «pasado
 * mañana», «el viernes», «el 12», «el 3 de septiembre». Sin señal → undefined.
 */
export function extraerFechaRelativa(texto: string, desde: Date = new Date()): string | undefined {
	const t = texto.toLowerCase();
	// Ancla a mediodía del día local: la aritmética de días no baila con DST.
	const base = new Date(`${diaLocal(desde)}T12:00:00`);
	const masDias = (n: number) => {
		const fecha = new Date(base);
		fecha.setDate(fecha.getDate() + n);
		return diaLocal(fecha);
	};

	if (/\bpasado\s*mañana\b/.test(t)) return masDias(2);
	if (/\bhoy\b|\besta\s+(mañana|tarde|noche)\b/.test(t)) return masDias(0);
	if (/\bmañana\b/.test(t)) return masDias(1);

	for (const [patron, objetivo] of DIAS_SEMANA) {
		if (!patron.test(t)) continue;
		// «El viernes» siendo viernes = el que viene; para hoy ya está «hoy».
		return masDias((objetivo - base.getDay() + 7) % 7 || 7);
	}

	const conMes = t
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.match(/\bel\s+(\d{1,2})\s+de\s+([a-z]+)/);
	if (conMes) {
		const mes = MESES.indexOf(conMes[2]);
		const dia = Number(conMes[1]);
		if (mes >= 0 && dia >= 1 && dia <= 31) {
			const fecha = new Date(base.getFullYear(), mes, dia, 12);
			if (diaLocal(fecha) < diaLocal(base)) fecha.setFullYear(fecha.getFullYear() + 1);
			return diaLocal(fecha);
		}
	}

	const soloDia = t.match(/\bel\s+(?:d[ií]a\s+)?(\d{1,2})\b(?!\s*de\b)(?![:.]\d)/);
	if (soloDia) {
		const dia = Number(soloDia[1]);
		if (dia >= 1 && dia <= 31) {
			const fecha = new Date(base.getFullYear(), base.getMonth(), dia, 12);
			if (diaLocal(fecha) < diaLocal(base)) fecha.setMonth(fecha.getMonth() + 1);
			return diaLocal(fecha);
		}
	}

	return undefined;
}

export type EventoExtraido = { nombre: string; fecha: string; hora?: string };

/**
 * Saca nombre, fecha y hora de «apunta que hoy tengo reunión de fluxu a las
 * 21:00 o por ahí». Solo con hora asume hoy; sin ninguna señal temporal → null.
 */
export function extraerEvento(texto: string, desde: Date = new Date()): EventoExtraido | null {
	const hora = extraerHora(texto);
	const fecha = extraerFechaRelativa(texto, desde);
	if (!fecha && !hora) return null;

	const nombre = texto
		// Muletillas de arranque y la orden de apuntar.
		.replace(/^[¡!¿?\s]*(lo primero|una cosa|por cierto|oye|a ver)[,:.]?\s*/i, '')
		.replace(/\b(ap[uú]nta(me|r)?|anota(me|r)?|recu[eé]rda(me)?|registra|guarda)\s*(que\s*)?/gi, '')
		// Referencias temporales: ya viven en fecha/hora.
		.replace(/\bpasado\s*mañana\b/gi, '')
		.replace(/\b(hoy|mañana|esta\s+(mañana|tarde|noche))\b/gi, '')
		.replace(/\b(el\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi, '')
		.replace(/\bel\s+(d[ií]a\s+)?\d{1,2}(\s+de\s+[a-záéíóúñ]+)?\b/gi, '')
		.replace(/\b(sobre|hacia|a eso de)\s+las?\s+\d{1,2}([:.h]\d{2})?\b/gi, '')
		.replace(/\ba las?\s+\d{1,2}([:.h]\d{2})?\b/gi, '')
		.replace(/\b\d{1,2}:\d{2}\b/g, '')
		// Coletillas de aproximación.
		.replace(/\b(seguramente|probablemente|creo que|igual|más o menos|aprox\.?|o por ah[ií]|o así)\b/gi, '')
		// Verbos de agenda que solo enmarcan.
		.replace(/\b(tengo|tenemos|he quedado|hemos quedado|quedo)\s+(una?\s+)?/gi, '')
		.replace(/^que\s+/i, '')
		.replace(/\s{2,}/g, ' ')
		.replace(/\s+([,.;])/g, '$1')
		.replace(/^[\s,.;:—-]+|[\s,.;:—-]+$/g, '')
		.trim();

	if (nombre.length < 3) return null;
	const resultado: EventoExtraido = {
		nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
		fecha: fecha ?? diaLocal(desde)
	};
	if (hora) resultado.hora = hora;
	return resultado;
}

export function payloadDesdeTexto(tipo: string, texto: string): Payload | null {
	const limpio = texto.trim();
	switch (tipo) {
		case 'gasto': {
			const importe = extraerImporte(limpio);
			if (importe === undefined) return null;
			const descripcion = limpio
				.replace(/(\d+(?:[.,]\d{1,2})?)\s*(€|euros?|eur)?/i, '')
				.replace(/\s{2,}/g, ' ')
				.trim();
			return { importe, categoria: categoriaGasto(limpio), descripcion };
		}
		case 'tarea':
			return { texto: limpio, hecha: false };
		case 'evento': {
			const evento = extraerEvento(limpio);
			return evento ? { ...evento } : null;
		}
		case 'pelicula':
			return { titulo: limpio, estado: 'pendiente', formato: 'pelicula' };
		case 'deseo':
			return { nombre: limpio, estado: 'enfriando' };
		case 'metrica':
		case 'suscripcion':
		case 'vencimiento':
		case 'prestamo':
			// Necesitan datos estructurados: mejor su formulario propio.
			return null;
		default: {
			const def = definicion(tipo);
			return { [def.campoPrincipal]: limpio };
		}
	}
}
