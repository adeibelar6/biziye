import { fail } from '@sveltejs/kit';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';
import {
	crearEntrada,
	editarEntrada,
	listarTareasPendientes,
	obtenerEntrada
} from '$lib/server/entradas';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const usuario = locals.usuario!;
	const pendientes = await listarTareasPendientes(usuario.id, 100);
	const hechas = await bd()
		.select()
		.from(tablas.entradas)
		.where(
			and(
				eq(tablas.entradas.userId, usuario.id),
				eq(tablas.entradas.tipo, 'tarea'),
				isNull(tablas.entradas.borradoEn),
				sql`${tablas.entradas.payload}->>'hecha' = 'true'`
			)
		)
		.orderBy(desc(sql`${tablas.entradas.payload}->>'hecha_en'`))
		.limit(20);

	return { pendientes, hechas };
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		const datos = await request.formData();
		const texto = String(datos.get('texto') ?? '').trim();
		if (!texto) return fail(400, { error: 'Escribe la tarea primero.' });

		const recordatorio = String(datos.get('recordatorio_en') ?? '');
		const payload: Record<string, unknown> = { texto, hecha: false };
		if (recordatorio && !Number.isNaN(Date.parse(recordatorio))) {
			payload.recordatorio_en = recordatorio;
		}

		await crearEntrada(locals.usuario!.id, { tipo: 'tarea', payload });
		return { creada: true };
	},

	alternar: async ({ request, locals }) => {
		const datos = await request.formData();
		const id = String(datos.get('id') ?? '');
		const entrada = await obtenerEntrada(locals.usuario!.id, id);
		if (!entrada || entrada.tipo !== 'tarea') return fail(404, { error: 'No existe.' });

		const payload = { ...(entrada.payload as Record<string, unknown>) };
		if (payload.hecha === true) {
			payload.hecha = false;
			delete payload.hecha_en;
		} else {
			payload.hecha = true;
			payload.hecha_en = new Date().toISOString();
		}

		await editarEntrada(locals.usuario!.id, id, { payload });
		return { alternada: id };
	}
};
