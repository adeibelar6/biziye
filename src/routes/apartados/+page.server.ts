import { contarEntradas } from '$lib/server/entradas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const inbox = await contarEntradas(locals.usuario!.id, { tipo: 'sin_clasificar' });
	return { inbox };
};
