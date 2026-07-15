import { fail } from '@sveltejs/kit';
import { crearEntrada, listarEntradas } from '$lib/server/entradas';
import { generarInformeMensual, generarRevisionSemanal } from '$lib/server/ia/generar';
import { configIA, guardarConfig, leerConfig } from '$lib/server/config';
import { diaLocal } from '$lib/fechas';
import type { Actions, PageServerLoad } from './$types';

/** Últimos 6 meses ('YYYY-MM'), el actual primero. */
function mesesRecientes(): string[] {
	const meses: string[] = [];
	const fecha = new Date();
	for (let i = 0; i < 6; i++) {
		meses.push(diaLocal(fecha).slice(0, 7));
		fecha.setMonth(fecha.getMonth() - 1);
	}
	return meses;
}

type InformeCacheado = { texto: string; generadoEn: string };

/**
 * Un mes cerrado no cambia: su informe se cachea para siempre. El mes en
 * curso se regenera como mucho una vez al día (con la API real, cada
 * generación cuesta dinero).
 */
async function informeConCache(userId: string, mes: string): Promise<string | null> {
	const clave = `informe:${mes}`;
	const hoy = diaLocal();
	const cacheado = await leerConfig<InformeCacheado | null>(userId, clave, null);
	const esMesCerrado = mes < hoy.slice(0, 7);
	if (cacheado && (esMesCerrado || cacheado.generadoEn === hoy)) return cacheado.texto;

	const texto = await generarInformeMensual(userId, mes);
	if (texto) {
		await guardarConfig(userId, clave, { texto, generadoEn: hoy } satisfies InformeCacheado);
	}
	return texto;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.usuario!.id;
	const ia = await configIA(userId);
	const meses = mesesRecientes();
	const mesPedido = url.searchParams.get('mes') ?? meses[0];
	const mes = /^\d{4}-\d{2}$/.test(mesPedido) ? mesPedido : meses[0];

	const [informe, revisiones] = await Promise.all([
		ia.activa ? informeConCache(userId, mes) : Promise.resolve(null),
		listarEntradas(userId, { tipo: 'nota', tag: 'revision', limite: 5 })
	]);

	return {
		ia,
		meses,
		mes,
		informe,
		ultimaRevision: revisiones[0]
			? { id: revisiones[0].id, fecha: revisiones[0].timestamp.toISOString() }
			: null
	};
};

export const actions: Actions = {
	prepararRevision: async ({ locals }) => {
		const guion = await generarRevisionSemanal(locals.usuario!.id);
		if (!guion) {
			return fail(400, { error: 'La IA está apagada: no hay guion que preparar.' });
		}
		return { guion };
	},

	guardarRevision: async ({ request, locals }) => {
		const datos = await request.formData();
		const guion = String(datos.get('guion') ?? '').trim();
		const respuestas = String(datos.get('respuestas') ?? '').trim();
		if (!respuestas) {
			return fail(400, { guion, error: 'Escribe algo, aunque sea una línea honesta.' });
		}
		await crearEntrada(locals.usuario!.id, {
			tipo: 'nota',
			payload: {
				texto: `Revisión semanal\n\n${guion ? guion + '\n\n' : ''}**Mis respuestas**\n${respuestas}`
			},
			tags: ['revision']
		});
		return { guardada: true };
	}
};
