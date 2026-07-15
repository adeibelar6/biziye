import { fail, redirect } from '@sveltejs/kit';
import { configIA } from '$lib/server/config';
import { crearEntrada, listarEntradas } from '$lib/server/entradas';
import { generarCierreDelDia } from '$lib/server/ia/generar';
import { definicion } from '$lib/tipos';
import { diaLocal } from '$lib/fechas';
import type { Actions, PageServerLoad } from './$types';

/** Cierre de hoy ya guardado, si existe. */
async function cierreDeHoy(userId: string) {
	const inicioDia = new Date(`${diaLocal()}T00:00:00`);
	const cierres = await listarEntradas(userId, {
		tipo: 'nota',
		tag: 'cierre',
		desde: inicioDia,
		limite: 1
	});
	return cierres[0] ?? null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const usuario = locals.usuario!;

	const hecho = await cierreDeHoy(usuario.id);
	if (hecho) {
		return { estado: 'hecho' as const, cierre: hecho, preguntas: [] as string[] };
	}

	const preguntas = await generarCierreDelDia(usuario.id);
	if (!preguntas) {
		return { estado: 'ia_apagada' as const, cierre: null, preguntas: [] as string[] };
	}

	return { estado: 'pendiente' as const, cierre: null, preguntas };
};

export const actions: Actions = {
	guardar: async ({ request, locals }) => {
		const datos = await request.formData();
		const preguntas = datos.getAll('pregunta').map(String);
		const respuestas = datos.getAll('respuesta').map(String);

		const partes: string[] = [];
		for (let i = 0; i < preguntas.length; i++) {
			const respuesta = (respuestas[i] ?? '').trim();
			if (respuesta) {
				partes.push(`**${preguntas[i]}**\n${respuesta}`);
			}
		}

		if (partes.length === 0) {
			return fail(400, { error: 'Responde al menos a una pregunta, aunque sea corto.' });
		}

		// Misma regla de privacidad que la captura: si el tipo está oculto
		// en Ajustes, la entrada nace invisible para la IA.
		const config = await configIA(locals.usuario!.id);
		await crearEntrada(locals.usuario!.id, {
			tipo: 'nota',
			payload: { texto: `Cierre del día\n\n${partes.join('\n\n')}` },
			tags: ['cierre'],
			visibleIa: definicion('nota').visibleIaPorDefecto && !config.tiposOcultos.includes('nota')
		});

		redirect(303, '/cierre');
	}
};
