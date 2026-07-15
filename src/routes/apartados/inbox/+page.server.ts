import { fail } from '@sveltejs/kit';
import { editarEntrada, listarEntradas, obtenerEntrada } from '$lib/server/entradas';
import { TIPOS } from '$lib/tipos';
import { payloadDesdeTexto } from '$lib/tipos/desde-texto';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const entradas = await listarEntradas(locals.usuario!.id, {
		tipo: 'sin_clasificar',
		limite: 100
	});
	return { entradas };
};

export const actions: Actions = {
	/** Clasificación rápida desde el inbox: convierte la captura al tipo elegido. */
	clasificar: async ({ request, locals }) => {
		const datos = await request.formData();
		const id = String(datos.get('id') ?? '');
		const tipo = String(datos.get('tipo') ?? '');
		if (!TIPOS.has(tipo) || tipo === 'sin_clasificar') {
			return fail(400, { error: 'Tipo no válido.' });
		}

		const entrada = await obtenerEntrada(locals.usuario!.id, id);
		if (!entrada) return fail(404, { error: 'La entrada ya no existe.' });

		const texto = String((entrada.payload as Record<string, unknown>).texto ?? '');
		const payload = payloadDesdeTexto(tipo, texto);
		if (!payload) {
			return fail(400, {
				error: `«${TIPOS.get(tipo)?.nombre}» necesita datos que este texto no tiene. Ábrela y rellénalos.`,
				id
			});
		}

		// Fuera la pista «quería:tipo» si la había.
		const tags = entrada.tags.filter((t) => !t.startsWith('quería:'));

		await editarEntrada(locals.usuario!.id, id, { tipo, payload, tags });
		return { clasificada: id };
	}
};
