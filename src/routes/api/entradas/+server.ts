import { json } from '@sveltejs/kit';
import { listarEntradas } from '$lib/server/entradas';
import type { RequestHandler } from './$types';

/** Listado paginado para el timeline: filtros por tipo, tag, texto y fecha. */
export const GET: RequestHandler = async ({ url, locals }) => {
	const usuario = locals.usuario!;
	const parametros = url.searchParams;

	const limite = Math.min(Number(parametros.get('limite')) || 30, 100);
	const antesDe = parametros.get('antesDe');
	const desde = parametros.get('desde');
	const hasta = parametros.get('hasta');

	const entradas = await listarEntradas(usuario.id, {
		tipo: parametros.get('tipo') || undefined,
		tag: parametros.get('tag') || undefined,
		q: parametros.get('q') || undefined,
		desde: desde ? new Date(desde) : undefined,
		hasta: hasta ? new Date(hasta + 'T23:59:59.999') : undefined,
		antesDe: antesDe && !Number.isNaN(Date.parse(antesDe)) ? new Date(antesDe) : undefined,
		limite: limite + 1
	});

	const hayMas = entradas.length > limite;
	return json({ entradas: entradas.slice(0, limite), hayMas });
};
