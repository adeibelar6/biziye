import { json } from '@sveltejs/kit';
import { borrarEntrada, editarEntrada, obtenerEntrada } from '$lib/server/entradas';
import { TIPOS } from '$lib/tipos';
import { validarPayload } from '$lib/tipos/validar';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const entrada = await obtenerEntrada(locals.usuario!.id, params.id);
	if (!entrada) return json({ error: 'No existe' }, { status: 404 });
	return json({ entrada });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const usuario = locals.usuario!;
	const cuerpo = await request.json().catch(() => null);
	if (!cuerpo || typeof cuerpo !== 'object') {
		return json({ error: 'Petición vacía' }, { status: 400 });
	}

	const actual = await obtenerEntrada(usuario.id, params.id);
	if (!actual) return json({ error: 'No existe' }, { status: 404 });

	const cambios: Parameters<typeof editarEntrada>[2] = {};

	if (typeof cuerpo.tipo === 'string') {
		if (!TIPOS.has(cuerpo.tipo)) return json({ error: 'Tipo desconocido' }, { status: 400 });
		cambios.tipo = cuerpo.tipo;
	}

	if (cuerpo.payload && typeof cuerpo.payload === 'object') {
		const tipoFinal = cambios.tipo ?? actual.tipo;
		const resultado = validarPayload(tipoFinal, cuerpo.payload);
		if (!resultado.valido) return json({ error: resultado.error }, { status: 400 });
		cambios.payload = resultado.payload;
	}

	if (Array.isArray(cuerpo.tags)) {
		cambios.tags = cuerpo.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
	}

	if (typeof cuerpo.visibleIa === 'boolean') {
		cambios.visibleIa = cuerpo.visibleIa;
	}

	if (typeof cuerpo.timestamp === 'string' && !Number.isNaN(Date.parse(cuerpo.timestamp))) {
		cambios.timestamp = new Date(cuerpo.timestamp);
	}

	const entrada = await editarEntrada(usuario.id, params.id, cambios);
	return json({ entrada });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const borrada = await borrarEntrada(locals.usuario!.id, params.id);
	if (!borrada) return json({ error: 'No existe' }, { status: 404 });
	return json({ ok: true });
};
