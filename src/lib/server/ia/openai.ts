import type {
	Clasificacion,
	HerramientaIA,
	MensajeIA,
	PropositoGeneracion,
	ProveedorIA
} from './tipos';
import { TIPOS } from '$lib/tipos';

/**
 * Proveedor OpenAI (API oficial de pago por uso) hablando el protocolo
 * /chat/completions con function calling. Sin SDK: fetch a pelo, menos
 * dependencias y sirve también para el puente (bridge.ts) cambiando la URL
 * base y el token.
 */

export type ConfigOpenAI = {
	nombre: string;
	baseUrl: string;
	apiKey: string;
	modelo: string;
};

type MensajeAPI = {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string | null;
	tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
	tool_call_id?: string;
};

const INSTRUCCIONES_BASE =
	'Eres la IA de BIZIYE, la app personal de vida de una sola persona. Respondes SIEMPRE en ' +
	'castellano, con frases directas, honestas y sin peloteo. Actúas como espejo: haces ver ' +
	'patrones y preguntas incómodas cuando toca, sin ser cruel. Los datos que recibes ya vienen ' +
	'filtrados por privacidad: trabaja solo con ellos y no inventes recuerdos.';

const INSTRUCCIONES_GENERAR: Record<PropositoGeneracion, string> = {
	cierre_dia:
		'Genera el cierre del día: 2 o 3 preguntas concretas y personales según lo registrado hoy ' +
		'(los datos van en JSON). Nada de cuestionario genérico. Una pregunta por línea, sin numerar.',
	briefing:
		'Genera el briefing matinal a partir del JSON: tareas pendientes, avisos próximos y métricas ' +
		'de ayer. Breve (3-5 frases), útil y con un aviso basado en patrones si los datos lo sugieren.',
	informe_mensual:
		'Genera el informe mensual en Markdown a partir del JSON: totales, dinero, métricas medias, ' +
		'fallos y logros, cine y primeras veces. Busca patrones y correlaciones; señala 2-3 ' +
		'observaciones que la persona probablemente no ve. Cierra con una pregunta incómoda.',
	revision_semanal:
		'Genera la revisión semanal: resumen corto de la semana (JSON adjunto) y las preguntas fijas ' +
		'del ritual (qué falló, qué funcionó, qué repites, qué dejas de hacer). En Markdown.',
	perfil:
		'Actualiza el documento-perfil de la persona (Markdown). Recibes el perfil actual y datos ' +
		'nuevos en JSON. Mantén la estructura, integra lo nuevo (patrones, disparadores, fortalezas, ' +
		'qué funciona), quita lo obsoleto. Devuelve el documento COMPLETO actualizado.'
};

export function crearProveedorOpenAI(config: ConfigOpenAI): ProveedorIA {
	async function llamar(cuerpo: Record<string, unknown>): Promise<{
		message?: { content?: string | null; tool_calls?: MensajeAPI['tool_calls'] };
	}> {
		const respuesta = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${config.apiKey}`
			},
			body: JSON.stringify({ model: config.modelo, ...cuerpo })
		});
		if (!respuesta.ok) {
			const detalle = await respuesta.text().catch(() => '');
			throw new Error(`Proveedor ${config.nombre}: HTTP ${respuesta.status} ${detalle.slice(0, 300)}`);
		}
		const datos = (await respuesta.json()) as {
			choices?: { message?: { content?: string | null; tool_calls?: MensajeAPI['tool_calls'] } }[];
		};
		return datos.choices?.[0] ?? {};
	}

	return {
		nombre: config.nombre,

		async clasificar(texto): Promise<Clasificacion | null> {
			const tipos = [...TIPOS.values()]
				.filter((d) => d.tipo !== 'sin_clasificar')
				.map(
					(d) =>
						`- ${d.tipo}: ${d.descripcion} Campos: ${d.campos.map((c) => c.clave + (c.requerido ? '*' : '')).join(', ')}`
				)
				.join('\n');

			const eleccion = await llamar({
				temperature: 0.1,
				response_format: { type: 'json_object' },
				messages: [
					{
						role: 'system',
						content:
							INSTRUCCIONES_BASE +
							'\nClasificas una captura de texto libre en uno de estos tipos de entrada:\n' +
							tipos +
							'\nResponde SOLO un JSON: {"tipo": string, "payload": object, "tags": string[], "confianza": number 0-1}. ' +
							'El payload usa las claves del tipo elegido (los campos con * son obligatorios). ' +
							'Si el texto no encaja claramente en ningún tipo, usa confianza baja (<0.5).'
					},
					{ role: 'user', content: texto }
				] satisfies MensajeAPI[]
			});

			try {
				const bruto = JSON.parse(eleccion.message?.content ?? '');
				if (typeof bruto?.tipo !== 'string' || !TIPOS.has(bruto.tipo)) return null;
				return {
					tipo: bruto.tipo,
					payload: bruto.payload && typeof bruto.payload === 'object' ? bruto.payload : { texto },
					tags: Array.isArray(bruto.tags) ? bruto.tags.map(String).slice(0, 5) : [],
					confianza: typeof bruto.confianza === 'number' ? bruto.confianza : 0
				};
			} catch {
				return null;
			}
		},

		async chat(mensajes: MensajeIA[], herramientas: HerramientaIA[]) {
			const historial: MensajeAPI[] = [
				{
					role: 'system',
					content:
						INSTRUCCIONES_BASE +
						' Tienes herramientas para consultar la base de datos de la app y para crear ' +
						'entradas cuando la persona te pida apuntar algo. Úsalas en vez de inventar.'
				},
				...mensajes.map(
					(m): MensajeAPI => ({
						role: m.rol === 'ia' ? 'assistant' : m.rol === 'sistema' ? 'system' : 'user',
						content: m.contenido
					})
				)
			];

			const tools = herramientas.map((h) => ({
				type: 'function' as const,
				function: { name: h.nombre, description: h.descripcion, parameters: h.parametros }
			}));

			const usadas: string[] = [];

			for (let vuelta = 0; vuelta < 5; vuelta++) {
				const eleccion = await llamar({ messages: historial, tools, temperature: 0.4 });
				const mensaje = eleccion.message;
				if (!mensaje) break;

				if (mensaje.tool_calls && mensaje.tool_calls.length > 0) {
					historial.push({
						role: 'assistant',
						content: mensaje.content ?? null,
						tool_calls: mensaje.tool_calls
					});
					for (const llamada of mensaje.tool_calls) {
						const h = herramientas.find((x) => x.nombre === llamada.function.name);
						let resultado = 'Herramienta desconocida.';
						if (h) {
							usadas.push(h.nombre);
							try {
								resultado = await h.ejecutar(JSON.parse(llamada.function.arguments || '{}'));
							} catch (error) {
								resultado = `La herramienta falló: ${error instanceof Error ? error.message : 'error'}`;
							}
						}
						historial.push({ role: 'tool', tool_call_id: llamada.id, content: resultado });
					}
					continue;
				}

				return { texto: mensaje.content ?? '', herramientasUsadas: usadas };
			}

			return {
				texto: 'No he podido cerrar la respuesta (demasiadas vueltas de herramientas).',
				herramientasUsadas: usadas
			};
		},

		async generar(proposito, datos) {
			const eleccion = await llamar({
				temperature: 0.5,
				messages: [
					{ role: 'system', content: INSTRUCCIONES_BASE + '\n' + INSTRUCCIONES_GENERAR[proposito] },
					{ role: 'user', content: datos }
				] satisfies MensajeAPI[]
			});
			return eleccion.message?.content ?? '';
		}
	};
}
