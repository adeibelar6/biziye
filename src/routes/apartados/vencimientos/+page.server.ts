import { fail } from '@sveltejs/kit';
import { crearEntrada, listarEntradas } from '$lib/server/entradas';
import { definicion, type Payload } from '$lib/tipos';
import { validarPayload } from '$lib/tipos/validar';
import { diaLocal } from '$lib/fechas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const entradas = await listarEntradas(locals.usuario!.id, { tipo: 'vencimiento', limite: 100 });
	const hoy = diaLocal();

	const conFecha = entradas
		.map((e) => ({
			id: e.id,
			payload: e.payload as Payload,
			fecha: String((e.payload as Payload).fecha ?? '')
		}))
		.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

	return {
		proximos: conFecha.filter((v) => v.fecha >= hoy),
		pasados: conFecha.filter((v) => v.fecha < hoy).reverse()
	};
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		const datos = await request.formData();
		const def = definicion('vencimiento');
		const bruto: Payload = {};
		for (const campo of def.campos) {
			const valor = datos.get(campo.clave);
			if (valor !== null) bruto[campo.clave] = String(valor);
		}
		const resultado = validarPayload('vencimiento', bruto);
		if (!resultado.valido) return fail(400, { error: resultado.error });

		await crearEntrada(locals.usuario!.id, { tipo: 'vencimiento', payload: resultado.payload });
		return { hecho: true };
	}
};
