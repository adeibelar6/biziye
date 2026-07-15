import { listarEntradas } from '$lib/server/entradas';
import type { PageServerLoad } from './$types';

const TAMANO_PAGINA = 30;

export const load: PageServerLoad = async ({ locals, url }) => {
	const tipo = url.searchParams.get('tipo') || undefined;
	const q = url.searchParams.get('q') || undefined;
	const tag = url.searchParams.get('tag') || undefined;

	const entradas = await listarEntradas(locals.usuario!.id, {
		tipo,
		q,
		tag,
		limite: TAMANO_PAGINA + 1
	});

	return {
		entradas: entradas.slice(0, TAMANO_PAGINA),
		hayMas: entradas.length > TAMANO_PAGINA,
		filtros: { tipo: tipo ?? null, q: q ?? null, tag: tag ?? null }
	};
};
