import { contarEntradas, listarEntradas } from '$lib/server/entradas';
import { estadoEfectivoDeseo } from '$lib/vida-practica';
import type { Payload } from '$lib/tipos';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.usuario!.id;
	const [inbox, deseos] = await Promise.all([
		contarEntradas(userId, { tipo: 'sin_clasificar' }),
		listarEntradas(userId, { tipo: 'deseo', limite: 100 })
	]);

	const deseosListos = deseos.filter(
		(d) => estadoEfectivoDeseo(d.payload as Payload, d.timestamp) === 'disponible'
	).length;

	return { inbox, deseosListos };
};
