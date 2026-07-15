import { error, fail, redirect } from '@sveltejs/kit';
import { borrarEntrada, editarEntrada, obtenerEntrada } from '$lib/server/entradas';
import { TIPOS, definicion } from '$lib/tipos';
import { validarPayload } from '$lib/tipos/validar';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const entrada = await obtenerEntrada(locals.usuario!.id, params.id);
	if (!entrada) error(404, 'Esta entrada no existe (o se borró).');
	return { entrada };
};

export const actions: Actions = {
	guardar: async ({ params, request, locals }) => {
		const usuario = locals.usuario!;
		const datos = await request.formData();

		const tipo = String(datos.get('__tipo') ?? '');
		if (!TIPOS.has(tipo)) return fail(400, { error: 'Tipo desconocido.' });

		const def = definicion(tipo);
		const payloadBruto: Record<string, unknown> = {};
		for (const campo of def.campos) {
			if (campo.control === 'interruptor') {
				payloadBruto[campo.clave] = datos.has(campo.clave);
			} else {
				const valor = datos.get(campo.clave);
				if (valor !== null) payloadBruto[campo.clave] = String(valor);
			}
		}

		const resultado = validarPayload(tipo, payloadBruto);
		if (!resultado.valido) return fail(400, { error: resultado.error });

		const tags = String(datos.get('__tags') ?? '')
			.split(',')
			.map((t) => t.trim().replace(/^#/, ''))
			.filter(Boolean);

		const visibleIa = datos.has('__visibleIa');

		const instante = String(datos.get('__timestamp') ?? '');
		const timestamp =
			instante && !Number.isNaN(Date.parse(instante)) ? new Date(instante) : undefined;

		// Si la tarea se marca hecha ahora, apunta cuándo.
		if (tipo === 'tarea' && resultado.payload.hecha === true) {
			const actual = await obtenerEntrada(usuario.id, params.id);
			const yaHecha = (actual?.payload as Record<string, unknown>)?.hecha === true;
			if (!yaHecha) resultado.payload.hecha_en = new Date().toISOString();
		}

		const entrada = await editarEntrada(usuario.id, params.id, {
			tipo,
			payload: resultado.payload,
			tags,
			visibleIa,
			timestamp
		});
		if (!entrada) return fail(404, { error: 'La entrada ya no existe.' });

		return { guardada: true };
	},

	borrar: async ({ params, locals }) => {
		await borrarEntrada(locals.usuario!.id, params.id);
		redirect(303, '/timeline');
	}
};
