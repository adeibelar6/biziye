import { fail } from '@sveltejs/kit';
import { crearEntrada, editarEntrada, listarEntradas, obtenerEntrada } from '$lib/server/entradas';
import { definicion, type Payload } from '$lib/tipos';
import { validarPayload } from '$lib/tipos/validar';
import { saldosPrestamos } from '$lib/vida-practica';
import { diaLocal } from '$lib/fechas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const entradas = await listarEntradas(locals.usuario!.id, { tipo: 'prestamo', limite: 100 });
	const prestamos = entradas.map((e) => ({
		id: e.id,
		payload: e.payload as Payload,
		apuntadoEn: e.timestamp.toISOString()
	}));

	return {
		pendientes: prestamos.filter((p) => p.payload.devuelto !== true),
		devueltos: prestamos.filter((p) => p.payload.devuelto === true),
		saldos: saldosPrestamos(entradas.map((e) => e.payload as Payload))
	};
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		const datos = await request.formData();
		const def = definicion('prestamo');
		const bruto: Payload = {};
		for (const campo of def.campos) {
			if (campo.control === 'interruptor') continue; // nace sin devolver
			const valor = datos.get(campo.clave);
			if (valor !== null) bruto[campo.clave] = String(valor);
		}
		if (!bruto.fecha) bruto.fecha = diaLocal();
		const resultado = validarPayload('prestamo', bruto);
		if (!resultado.valido) return fail(400, { error: resultado.error });

		await crearEntrada(locals.usuario!.id, {
			tipo: 'prestamo',
			payload: { ...resultado.payload, devuelto: false }
		});
		return { hecho: true };
	},

	devuelto: async ({ request, locals }) => {
		const datos = await request.formData();
		const id = String(datos.get('id') ?? '');
		const entrada = await obtenerEntrada(locals.usuario!.id, id);
		if (!entrada || entrada.tipo !== 'prestamo') {
			return fail(404, { error: 'Ese préstamo ya no existe.' });
		}
		const p = entrada.payload as Payload;
		await editarEntrada(locals.usuario!.id, id, {
			payload: { ...p, devuelto: p.devuelto !== true }
		});
		return { hecho: true };
	}
};
