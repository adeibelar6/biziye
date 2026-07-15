import { fail } from '@sveltejs/kit';
import { crearEntrada, editarEntrada, listarEntradas, obtenerEntrada } from '$lib/server/entradas';
import { definicion, type Payload } from '$lib/tipos';
import { validarPayload } from '$lib/tipos/validar';
import { diasDeEnfriamientoRestantes, estadoEfectivoDeseo } from '$lib/vida-practica';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const entradas = await listarEntradas(locals.usuario!.id, { tipo: 'deseo', limite: 100 });

	const deseos = entradas.map((e) => {
		const p = e.payload as Payload;
		return {
			id: e.id,
			payload: p,
			estado: estadoEfectivoDeseo(p, e.timestamp),
			diasRestantes: diasDeEnfriamientoRestantes(e.timestamp),
			apuntadoEn: e.timestamp.toISOString()
		};
	});

	const descartados = deseos.filter((d) => d.estado === 'descartado');

	return {
		enfriando: deseos.filter((d) => d.estado === 'enfriando'),
		disponibles: deseos.filter((d) => d.estado === 'disponible'),
		comprados: deseos.filter((d) => d.estado === 'comprado'),
		descartados,
		ahorrado: descartados.reduce((total, d) => total + (Number(d.payload.precio) || 0), 0)
	};
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		const datos = await request.formData();
		const def = definicion('deseo');
		const bruto: Payload = {};
		for (const campo of def.campos) {
			if (campo.clave === 'estado') continue; // todo deseo nace enfriándose
			const valor = datos.get(campo.clave);
			if (valor !== null) bruto[campo.clave] = String(valor);
		}
		const resultado = validarPayload('deseo', bruto);
		if (!resultado.valido) return fail(400, { error: resultado.error });

		await crearEntrada(locals.usuario!.id, {
			tipo: 'deseo',
			payload: { ...resultado.payload, estado: 'enfriando' }
		});
		return { hecho: true };
	},

	decidir: async ({ request, locals }) => {
		const datos = await request.formData();
		const id = String(datos.get('id') ?? '');
		const decision = String(datos.get('decision') ?? '');
		if (decision !== 'comprado' && decision !== 'descartado') {
			return fail(400, { error: 'Decisión desconocida.' });
		}
		const entrada = await obtenerEntrada(locals.usuario!.id, id);
		if (!entrada || entrada.tipo !== 'deseo') {
			return fail(404, { error: 'Ese deseo ya no existe.' });
		}
		// El enfriamiento se respeta: comprar solo cuando ya está disponible.
		const estado = estadoEfectivoDeseo(entrada.payload as Payload, entrada.timestamp);
		if (decision === 'comprado' && estado === 'enfriando') {
			return fail(400, { error: 'Aún se está enfriando. Esa es justo la gracia.' });
		}
		await editarEntrada(locals.usuario!.id, id, {
			payload: { ...(entrada.payload as Payload), estado: decision }
		});
		return { hecho: true };
	}
};
