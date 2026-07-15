import { json } from '@sveltejs/kit';
import { registrarMetricaDiaria } from '$lib/server/entradas';
import type { RequestHandler } from './$types';

/** Métricas de 1 toque desde Hoy: ánimo, energía o sueño (1-5). */
export const POST: RequestHandler = async ({ request, locals }) => {
	const cuerpo = await request.json().catch(() => null);
	const clave = cuerpo?.clave;
	const valor = Math.round(Number(cuerpo?.valor));

	if (!['animo', 'energia', 'sueno'].includes(clave) || valor < 1 || valor > 5) {
		return json({ error: 'Métrica no válida' }, { status: 400 });
	}

	const entrada = await registrarMetricaDiaria(locals.usuario!.id, clave, valor);
	return json({ entrada });
};
