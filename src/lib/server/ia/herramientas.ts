import { bloqueParaIA, entradasParaIA } from './datos';
import { clasificarYCrear } from './clasificar';
import { formatearEuros } from '$lib/tipos';
import { fechaCorta } from '$lib/fechas';
import type { HerramientaIA } from './tipos';

/**
 * Herramientas de consulta que la IA puede usar en el chat. TODAS leen a
 * través de entradasParaIA (filtro de privacidad en la capa de datos):
 * lo invisible no existe para estas funciones.
 */

function aFecha(valor: unknown): Date | undefined {
	if (typeof valor !== 'string' || !valor) return undefined;
	const fecha = new Date(valor);
	return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

export function herramientasParaUsuario(userId: string): HerramientaIA[] {
	return [
		{
			nombre: 'buscar_entradas',
			descripcion:
				'Busca en el diario de vida: texto libre, tipo de entrada, etiqueta y rango de fechas.',
			parametros: {
				type: 'object',
				properties: {
					q: { type: 'string', description: 'Texto a buscar' },
					tipo: {
						type: 'string',
						description:
							'Tipo de entrada (nota, fallo, logro, tarea, gasto, metrica, frase, chiste, primera_vez, suscripcion, vencimiento, prestamo, deseo, pelicula)'
					},
					tag: { type: 'string' },
					desde: { type: 'string', description: 'Fecha ISO (YYYY-MM-DD)' },
					hasta: { type: 'string', description: 'Fecha ISO (YYYY-MM-DD)' },
					limite: { type: 'number' }
				}
			},
			async ejecutar(argumentos) {
				const entradas = await entradasParaIA(userId, {
					q: typeof argumentos.q === 'string' ? argumentos.q : undefined,
					tipo: typeof argumentos.tipo === 'string' ? argumentos.tipo : undefined,
					tag: typeof argumentos.tag === 'string' ? argumentos.tag : undefined,
					desde: aFecha(argumentos.desde),
					hasta: aFecha(argumentos.hasta),
					limite: Math.min(Number(argumentos.limite) || 10, 25)
				});
				if (entradas.length === 0) return 'No hay nada registrado que encaje con esa búsqueda.';
				return bloqueParaIA(entradas);
			}
		},
		{
			nombre: 'resumen_gastos',
			descripcion: 'Total gastado y desglose por categorías en un rango de fechas.',
			parametros: {
				type: 'object',
				properties: {
					desde: { type: 'string', description: 'Fecha ISO (YYYY-MM-DD); por defecto, inicio de mes' },
					hasta: { type: 'string' }
				}
			},
			async ejecutar(argumentos) {
				const ahora = new Date();
				const desde =
					aFecha(argumentos.desde) ?? new Date(ahora.getFullYear(), ahora.getMonth(), 1);
				const hasta = aFecha(argumentos.hasta);
				const gastos = await entradasParaIA(userId, { tipo: 'gasto', desde, hasta, limite: 100 });

				if (gastos.length === 0) {
					return `No hay gastos registrados desde el ${fechaCorta(desde)}.`;
				}

				let total = 0;
				const porCategoria = new Map<string, number>();
				for (const gasto of gastos) {
					const importe = Number(gasto.payload.importe) || 0;
					const categoria = String(gasto.payload.categoria || 'otros');
					total += importe;
					porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + importe);
				}

				const desglose = [...porCategoria.entries()]
					.sort((a, b) => b[1] - a[1])
					.map(([categoria, suma]) => `${categoria}: ${formatearEuros(suma)}`)
					.join(' · ');

				return (
					`Desde el ${fechaCorta(desde)}${hasta ? ` hasta el ${fechaCorta(hasta)}` : ''}: ` +
					`${formatearEuros(total)} en ${gastos.length} gastos.\nPor categoría: ${desglose}.`
				);
			}
		},
		{
			nombre: 'cine',
			descripcion:
				'Consulta el módulo de cine y series: pendientes (opcionalmente de un recomendador), estadísticas/ranking, o una recomendación para esta noche.',
			parametros: {
				type: 'object',
				properties: {
					modo: { type: 'string', enum: ['pendientes', 'estadisticas', 'recomendacion'] },
					recomendador: { type: 'string' }
				},
				required: ['modo']
			},
			async ejecutar(argumentos) {
				const todas = await entradasParaIA(userId, { tipo: 'pelicula', limite: 100 });
				const pendientes = todas.filter((p) => p.payload.estado !== 'vista');
				const vistas = todas.filter((p) => p.payload.estado === 'vista');

				const modo = String(argumentos.modo || 'pendientes');

				if (modo === 'pendientes') {
					let lista = pendientes;
					const recomendador =
						typeof argumentos.recomendador === 'string' ? argumentos.recomendador.trim() : '';
					if (recomendador) {
						lista = pendientes.filter((p) =>
							String(p.payload.recomendador ?? '')
								.toLowerCase()
								.includes(recomendador.toLowerCase())
						);
						if (lista.length === 0) {
							return `No tienes nada pendiente recomendado por ${recomendador}.`;
						}
					}
					if (lista.length === 0) {
						return 'No tienes películas ni series pendientes. Apunta la próxima que te recomienden.';
					}
					return (
						'Pendientes:\n' +
						lista
							.map(
								(p) =>
									`- ${p.payload.titulo}${p.payload.recomendador ? ` (recomendada por ${p.payload.recomendador})` : ''}`
							)
							.join('\n')
					);
				}

				if (modo === 'estadisticas') {
					if (vistas.length === 0) return 'Todavía no has puntuado nada visto.';
					const conNota = vistas.filter((v) => typeof v.payload.nota === 'number');
					const media =
						conNota.length > 0
							? conNota.reduce((suma, v) => suma + Number(v.payload.nota), 0) / conNota.length
							: 0;
					const top = [...conNota]
						.sort((a, b) => Number(b.payload.nota) - Number(a.payload.nota))
						.slice(0, 5)
						.map((v, i) => `${i + 1}. ${v.payload.titulo} (${v.payload.nota}/10)`)
						.join('\n');
					return `Vistas: ${vistas.length} · nota media ${media.toFixed(1)}/10.\nTu top:\n${top}`;
				}

				// recomendación para esta noche
				if (pendientes.length === 0) {
					return 'Lista de pendientes vacía: esta noche toca elegir a ciegas o repetir un clásico.';
				}
				const conRecomendador = pendientes.filter((p) => p.payload.recomendador);
				const elegida = (conRecomendador[0] ?? pendientes[0]).payload;
				return (
					`Para esta noche: «${elegida.titulo}»` +
					(elegida.recomendador
						? `, que te recomendó ${elegida.recomendador}. Si acierta, súbele la fiabilidad.`
						: '. Lleva tiempo esperando en tu lista.')
				);
			}
		},
		{
			nombre: 'tareas_pendientes',
			descripcion: 'Lista las tareas sin hacer.',
			parametros: { type: 'object', properties: {} },
			async ejecutar() {
				const tareas = await entradasParaIA(userId, { tipo: 'tarea', limite: 50 });
				const pendientes = tareas.filter((t) => t.payload.hecha !== true);
				if (pendientes.length === 0) return 'No hay tareas pendientes. Disfrútalo.';
				return (
					`Tienes ${pendientes.length} pendientes:\n` +
					pendientes.map((t) => `- ${t.payload.texto}`).join('\n')
				);
			}
		},
		{
			nombre: 'crear_entrada',
			descripcion:
				'Crea una entrada nueva a partir de texto libre. Clasifica sola si no se indica tipo.',
			parametros: {
				type: 'object',
				properties: {
					texto: { type: 'string' },
					tipo: { type: 'string', description: 'Opcional: tipo forzado' }
				},
				required: ['texto']
			},
			async ejecutar(argumentos) {
				const texto = String(argumentos.texto ?? '').trim();
				if (!texto) return 'No había nada que apuntar.';
				const resultado = await clasificarYCrear(
					userId,
					texto,
					typeof argumentos.tipo === 'string' ? argumentos.tipo : undefined
				);
				return resultado.mensaje;
			}
		}
	];
}
