import { proveedorIA } from './index';
import { configIA } from '$lib/server/config';
import { crearEntrada } from '$lib/server/entradas';
import { TIPOS, definicion, resumenEntrada, type Payload } from '$lib/tipos';
import { payloadDesdeTexto } from '$lib/tipos/desde-texto';
import { validarPayload } from '$lib/tipos/validar';

const UMBRAL_CONFIANZA = 0.6;

export type ResultadoClasificacion = {
	tipo: string;
	payload: Payload;
	tags: string[];
} | null;

/**
 * Clasifica una captura de texto libre con el proveedor activo.
 * Devuelve null si la IA está apagada, el proveedor duda (confianza baja)
 * o el payload propuesto no pasa la validación del tipo → inbox.
 */
export async function clasificarCaptura(
	userId: string,
	texto: string
): Promise<ResultadoClasificacion> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) return null;

	let clasificacion;
	try {
		clasificacion = await proveedor.clasificar(texto);
	} catch (error) {
		console.error('[ia] La clasificación falló; la captura cae al inbox:', error);
		return null;
	}

	if (!clasificacion || clasificacion.confianza < UMBRAL_CONFIANZA) return null;
	if (!TIPOS.has(clasificacion.tipo) || clasificacion.tipo === 'sin_clasificar') return null;

	const validado = validarPayload(clasificacion.tipo, clasificacion.payload);
	if (!validado.valido) return null;

	return {
		tipo: clasificacion.tipo,
		payload: validado.payload,
		tags: clasificacion.tags.map((t) => t.trim()).filter(Boolean).slice(0, 5)
	};
}

/**
 * Clasifica y crea la entrada (la usa el chat con «apunta que…»).
 * Respeta los interruptores: si el tipo resultante está oculto para la IA,
 * la entrada nace con visible_ia = false.
 */
export async function clasificarYCrear(
	userId: string,
	texto: string,
	tipoForzado?: string
): Promise<{ mensaje: string; entradaId: string | null }> {
	const config = await configIA(userId);

	let tipo: string;
	let payload: Payload;
	let tags: string[] = [];

	if (tipoForzado && TIPOS.has(tipoForzado) && tipoForzado !== 'sin_clasificar') {
		const construido = payloadDesdeTexto(tipoForzado, texto);
		if (!construido) {
			const entrada = await crearEntrada(userId, {
				tipo: 'sin_clasificar',
				payload: { texto },
				tags: [`quería:${tipoForzado}`]
			});
			return {
				mensaje: `«${definicion(tipoForzado).nombre}» necesita datos que no saco del texto: lo dejo en el inbox para que lo completes.`,
				entradaId: entrada.id
			};
		}
		tipo = tipoForzado;
		payload = construido;
	} else {
		const clasificado = await clasificarCaptura(userId, texto);
		if (!clasificado) {
			const entrada = await crearEntrada(userId, { tipo: 'sin_clasificar', payload: { texto } });
			return {
				mensaje: 'No lo tengo claro, así que lo he dejado en el inbox para que lo clasifiques tú.',
				entradaId: entrada.id
			};
		}
		({ tipo, payload, tags } = clasificado);
	}

	const visibleIa = definicion(tipo).visibleIaPorDefecto && !config.tiposOcultos.includes(tipo);
	const entrada = await crearEntrada(userId, { tipo, payload, tags, visibleIa });
	return {
		mensaje: `Apuntado como ${definicion(tipo).nombre.toLowerCase()}: ${resumenEntrada(tipo, payload)}`,
		entradaId: entrada.id
	};
}
