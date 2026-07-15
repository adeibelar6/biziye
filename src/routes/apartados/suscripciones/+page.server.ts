import { fail } from '@sveltejs/kit';
import { crearEntrada, editarEntrada, listarEntradas, obtenerEntrada } from '$lib/server/entradas';
import { definicion, type Payload } from '$lib/tipos';
import { validarPayload } from '$lib/tipos/validar';
import { costeAnual, costeAnualTotal, periodicidadDe, proximaRenovacionEfectiva } from '$lib/vida-practica';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const entradas = await listarEntradas(locals.usuario!.id, { tipo: 'suscripcion', limite: 100 });

	const suscripciones = entradas
		.map((e) => {
			const p = e.payload as Payload;
			return {
				id: e.id,
				payload: p,
				activa: p.activa !== false,
				costeAnual: costeAnual(Number(p.precio) || 0, periodicidadDe(p)),
				proximaRenovacion: proximaRenovacionEfectiva(p)?.toISOString() ?? null,
				apuntadaEn: e.timestamp.toISOString()
			};
		})
		.sort((a, b) => {
			if (a.activa !== b.activa) return a.activa ? -1 : 1;
			return (a.proximaRenovacion ?? '9999') < (b.proximaRenovacion ?? '9999') ? -1 : 1;
		});

	return {
		suscripciones,
		totalAnual: costeAnualTotal(entradas.map((e) => e.payload as Payload))
	};
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		const datos = await request.formData();
		const def = definicion('suscripcion');
		const bruto: Payload = {};
		for (const campo of def.campos) {
			if (campo.control === 'interruptor') bruto[campo.clave] = datos.has(campo.clave);
			else {
				const valor = datos.get(campo.clave);
				if (valor !== null) bruto[campo.clave] = String(valor);
			}
		}
		const resultado = validarPayload('suscripcion', bruto);
		if (!resultado.valido) return fail(400, { error: resultado.error });

		await crearEntrada(locals.usuario!.id, { tipo: 'suscripcion', payload: resultado.payload });
		return { hecho: true };
	},

	alternar: async ({ request, locals }) => {
		const datos = await request.formData();
		const id = String(datos.get('id') ?? '');
		const entrada = await obtenerEntrada(locals.usuario!.id, id);
		if (!entrada || entrada.tipo !== 'suscripcion') {
			return fail(404, { error: 'Esa suscripción ya no existe.' });
		}
		const p = entrada.payload as Payload;
		await editarEntrada(locals.usuario!.id, id, {
			payload: { ...p, activa: p.activa === false }
		});
		return { hecho: true };
	}
};
