import { fail } from '@sveltejs/kit';
import { crearEntrada, editarEntrada, listarEntradas, obtenerEntrada } from '$lib/server/entradas';
import { definicion, type Payload } from '$lib/tipos';
import { validarPayload } from '$lib/tipos/validar';
import {
	estadisticasPorAnio,
	estadisticasPorGenero,
	notaMediaGlobal,
	ranking,
	recomendadores,
	type Titulo
} from '$lib/cine';
import { diaLocal } from '$lib/fechas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// La filmoteca entera: el ranking y las estadísticas se calculan sobre todo lo visto.
	const entradas = await listarEntradas(locals.usuario!.id, { tipo: 'pelicula', limite: 1000 });
	const titulos: Titulo[] = entradas.map((e) => ({
		id: e.id,
		payload: e.payload as Payload,
		timestamp: e.timestamp
	}));

	const vistas = titulos
		.filter((t) => t.payload.estado === 'vista')
		.sort((a, b) => {
			const fa = String(a.payload.vista_en ?? a.timestamp.toISOString());
			const fb = String(b.payload.vista_en ?? b.timestamp.toISOString());
			return fa < fb ? 1 : -1;
		});

	return {
		pendientes: titulos.filter((t) => t.payload.estado !== 'vista'),
		vistas,
		ranking: ranking(titulos),
		notaMedia: notaMediaGlobal(titulos),
		porGenero: estadisticasPorGenero(titulos).slice(0, 8),
		porAnio: estadisticasPorAnio(titulos).slice(0, 8),
		recomendadores: recomendadores(titulos).slice(0, 8)
	};
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		const datos = await request.formData();
		const def = definicion('pelicula');
		const bruto: Payload = {};
		for (const campo of def.campos) {
			const valor = datos.get(campo.clave);
			if (valor !== null && valor !== '') bruto[campo.clave] = String(valor);
		}
		const resultado = validarPayload('pelicula', bruto);
		if (!resultado.valido) return fail(400, { error: resultado.error });

		const payload: Payload = { estado: 'pendiente', formato: 'pelicula', ...resultado.payload };
		if (payload.estado === 'vista') {
			if (payload.nota === undefined) return fail(400, { error: 'Ponle nota: del 1 al 10.' });
			payload.vista_en ??= diaLocal();
		}
		await crearEntrada(locals.usuario!.id, { tipo: 'pelicula', payload });
		return { hecho: true };
	},

	vista: async ({ request, locals }) => {
		const datos = await request.formData();
		const id = String(datos.get('id') ?? '');
		const nota = Math.round(Number(datos.get('nota')));
		if (!Number.isFinite(nota) || nota < 1 || nota > 10) {
			return fail(400, { error: 'La nota va del 1 al 10.', id });
		}
		const entrada = await obtenerEntrada(locals.usuario!.id, id);
		if (!entrada || entrada.tipo !== 'pelicula') {
			return fail(404, { error: 'Ese título ya no existe.', id });
		}
		await editarEntrada(locals.usuario!.id, id, {
			payload: {
				...(entrada.payload as Payload),
				estado: 'vista',
				nota,
				vista_en: diaLocal()
			}
		});
		return { hecho: true };
	}
};
