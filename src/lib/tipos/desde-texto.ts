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
