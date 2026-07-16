import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { crearBDPrueba, crearUsuarioPrueba } from '../../../pruebas/bd-prueba';
import * as schema from '$lib/server/db/schema';
import type { BD } from '$lib/server/db';
import {
	avanzarPeriodo,
	dispararAvisosPendientes,
	finDeEnfriamiento,
	instanteAviso,
	siguienteAviso
} from './motor';

/**
 * Motor de recordatorios: cálculo de fechas (puro) y ciclo completo
 * entrada → recordatorio → disparo, contra PGlite con las migraciones reales.
 */

describe('cálculo de fechas', () => {
	it('avanzarPeriodo conserva el día del mes y no desborda febrero', () => {
		const enero31 = new Date(2026, 0, 31, 9, 0, 0);
		const febrero = avanzarPeriodo(enero31, 'mensual');
		expect([1, 2]).toContain(febrero.getMonth() === 1 ? 1 : 2); // sigue en febrero
		expect(febrero.getMonth()).toBe(1);
		expect(febrero.getDate()).toBe(28); // 2026 no es bisiesto

		const trimestre = avanzarPeriodo(new Date(2026, 10, 30), 'trimestral');
		expect(trimestre.getMonth()).toBe(1); // nov + 3 = feb
		expect(trimestre.getDate()).toBe(28);

		const anual = avanzarPeriodo(new Date(2024, 1, 29), 'anual'); // 29 feb bisiesto
		expect(anual.getFullYear()).toBe(2025);
		expect(anual.getDate()).toBe(28);

		expect(avanzarPeriodo(new Date(2026, 5, 15), 'semanal').getDate()).toBe(22);
	});

	it('instanteAviso resta la antelación y avisa a las 09:00', () => {
		const objetivo = new Date(2026, 7, 20, 12, 34);
		const aviso = instanteAviso(objetivo, 3);
		expect(aviso.getDate()).toBe(17);
		expect(aviso.getHours()).toBe(9);
	});

	it('siguienteAviso: única en el pasado no programa nada', () => {
		const ahora = new Date(2026, 6, 15);
		expect(siguienteAviso(new Date(2026, 6, 1), 'unica', 0, ahora)).toBeNull();
		const futuro = siguienteAviso(new Date(2026, 6, 20), 'unica', 2, ahora);
		expect(futuro?.proximoAviso.getDate()).toBe(18);
	});

	it('siguienteAviso: recurrente sale del pasado avanzando periodos', () => {
		const ahora = new Date(2026, 6, 15);
		const resultado = siguienteAviso(new Date(2026, 1, 10), 'mensual', 3, ahora);
		expect(resultado).not.toBeNull();
		expect(resultado!.proximoAviso.getTime()).toBeGreaterThan(ahora.getTime());
		// El objetivo queda en el 10 de agosto (el aviso de julio, día 7, ya pasó).
		expect(resultado!.fechaObjetivo.getMonth()).toBe(7);
		expect(resultado!.fechaObjetivo.getDate()).toBe(10);
	});

	it('finDeEnfriamiento son 30 días después', () => {
		const fin = finDeEnfriamiento(new Date(2026, 6, 1, 22, 0));
		expect(fin.getMonth()).toBe(6);
		expect(fin.getDate()).toBe(31);
		expect(fin.getHours()).toBe(9);
	});
});

describe('ciclo entrada → recordatorio → disparo', () => {
	let db: BD;
	let cerrarBD: () => Promise<void>;
	let userId: string;

	beforeAll(async () => {
		const prueba = await crearBDPrueba();
		db = prueba.bd;
		cerrarBD = prueba.cerrar;
		userId = await crearUsuarioPrueba(db);
	});

	afterAll(async () => {
		await cerrarBD();
	});

	async function recordatorioDe(entradaId: string) {
		const [fila] = await db
			.select()
			.from(schema.recordatorios)
			.where(eq(schema.recordatorios.entradaId, entradaId));
		return fila ?? null;
	}

	it('una suscripción crea su recordatorio con la antelación pedida', async () => {
		const { crearEntrada } = await import('$lib/server/entradas');
		const en20Dias = new Date();
		en20Dias.setDate(en20Dias.getDate() + 20);
		const fecha = en20Dias.toISOString().slice(0, 10);

		const entrada = await crearEntrada(userId, {
			tipo: 'suscripcion',
			payload: {
				nombre: 'Netflix',
				precio: 12.99,
				periodicidad: 'mensual',
				proxima_renovacion: fecha,
				aviso_dias: 3,
				activa: true
			}
		});

		const recordatorio = await recordatorioDe(entrada.id);
		expect(recordatorio).not.toBeNull();
		expect(recordatorio!.activo).toBe(true);
		expect(recordatorio!.regla).toBe('mensual');
		const esperado = new Date(`${fecha}T09:00:00`);
		esperado.setDate(esperado.getDate() - 3);
		expect(recordatorio!.proximoAviso?.getTime()).toBe(esperado.getTime());
	});

	it('marcar la tarea como hecha retira su recordatorio', async () => {
		const { crearEntrada, editarEntrada } = await import('$lib/server/entradas');
		const manana = new Date();
		manana.setDate(manana.getDate() + 1);

		const tarea = await crearEntrada(userId, {
			tipo: 'tarea',
			payload: { texto: 'renovar el DNI', recordatorio_en: manana.toISOString().slice(0, 10) }
		});
		expect(await recordatorioDe(tarea.id)).not.toBeNull();

		await editarEntrada(userId, tarea.id, {
			payload: { ...(tarea.payload as object), hecha: true }
		});
		expect(await recordatorioDe(tarea.id)).toBeNull();
	});

	it('un evento apunta su recordatorio a la hora del día señalado', async () => {
		const { crearEntrada } = await import('$lib/server/entradas');
		const manana = new Date();
		manana.setDate(manana.getDate() + 1);

		const entrada = await crearEntrada(userId, {
			tipo: 'evento',
			payload: {
				nombre: 'Reunión de fluxu',
				fecha: manana.toISOString().slice(0, 10),
				hora: '21:00'
			}
		});

		const recordatorio = await recordatorioDe(entrada.id);
		expect(recordatorio).not.toBeNull();
		expect(recordatorio!.titulo).toContain('Reunión de fluxu');
		expect(recordatorio!.titulo).toContain('21:00');
		expect(recordatorio!.fechaObjetivo.getHours()).toBe(21);
		// El aviso llega la mañana del evento, a las 09:00.
		expect(recordatorio!.proximoAviso?.getHours()).toBe(9);
	});

	it('borrar la entrada borra el recordatorio', async () => {
		const { crearEntrada, borrarEntrada } = await import('$lib/server/entradas');
		const entrada = await crearEntrada(userId, {
			tipo: 'vencimiento',
			payload: { nombre: 'ITV', fecha: '2030-05-10', antelacion_dias: 30 }
		});
		expect(await recordatorioDe(entrada.id)).not.toBeNull();
		await borrarEntrada(userId, entrada.id);
		expect(await recordatorioDe(entrada.id)).toBeNull();
	});

	it('un deseo que lleva >30 días dispara, pasa a disponible y no repite', async () => {
		const { crearEntrada } = await import('$lib/server/entradas');
		const hace31Dias = new Date();
		hace31Dias.setDate(hace31Dias.getDate() - 31);

		const deseo = await crearEntrada(userId, {
			tipo: 'deseo',
			payload: { nombre: 'cámara de fotos', precio: 400, estado: 'enfriando' },
			timestamp: hace31Dias
		});

		const disparados = await dispararAvisosPendientes();
		expect(disparados).toBeGreaterThanOrEqual(1);

		const [tras] = await db
			.select()
			.from(schema.entradas)
			.where(eq(schema.entradas.id, deseo.id));
		expect((tras.payload as { estado?: string }).estado).toBe('disponible');

		const recordatorio = await recordatorioDe(deseo.id);
		expect(recordatorio?.activo).toBe(false);

		// Idempotencia: una segunda pasada no encuentra nada que disparar.
		expect(await dispararAvisosPendientes()).toBe(0);
	});

	it('una suscripción disparada se reprograma al periodo siguiente', async () => {
		const { crearEntrada } = await import('$lib/server/entradas');
		const entrada = await crearEntrada(userId, {
			tipo: 'suscripcion',
			payload: {
				nombre: 'Gimnasio',
				precio: 35,
				periodicidad: 'mensual',
				proxima_renovacion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
					.toISOString()
					.slice(0, 10),
				aviso_dias: 3,
				activa: true
			}
		});

		// El aviso (renovación - 3 días) ya está en el pasado… pero la
		// sincronización lo empuja al mes siguiente, así que lo forzamos:
		await db
			.update(schema.recordatorios)
			.set({ proximoAviso: new Date(Date.now() - 60_000) })
			.where(eq(schema.recordatorios.entradaId, entrada.id));

		await dispararAvisosPendientes();

		const recordatorio = await recordatorioDe(entrada.id);
		expect(recordatorio!.activo).toBe(true);
		expect(recordatorio!.ultimoDisparo).not.toBeNull();
		expect(recordatorio!.proximoAviso!.getTime()).toBeGreaterThan(Date.now());
	});

	it('un vencimiento a menos días que su antelación avisa ya, no nace mudo', async () => {
		const { crearEntrada } = await import('$lib/server/entradas');
		const en10Dias = new Date();
		en10Dias.setDate(en10Dias.getDate() + 10);

		const entrada = await crearEntrada(userId, {
			tipo: 'vencimiento',
			payload: {
				nombre: 'ITV apurada',
				fecha: en10Dias.toISOString().slice(0, 10),
				antelacion_dias: 30
			}
		});

		const recordatorio = await recordatorioDe(entrada.id);
		expect(recordatorio?.activo).toBe(true);
		expect(recordatorio!.proximoAviso!.getTime()).toBeLessThanOrEqual(Date.now());

		// Y tras dispararlo, sigue apareciendo entre los avisos a la vista.
		await dispararAvisosPendientes();
		const { avisosProximos } = await import('./motor');
		const avisos = await avisosProximos(userId, 30, 10);
		expect(avisos.some((a) => a.titulo.includes('ITV apurada'))).toBe(true);
	});

	it('el reenganche no molesta si hay registros recientes', async () => {
		const { evaluarReenganche } = await import('./reenganche');
		const { leerConfig } = await import('$lib/server/config');
		// Acaba de crear entradas en los tests anteriores: no toca avisar.
		await evaluarReenganche(new Date(new Date().setHours(12, 0, 0, 0)));
		const estado = await leerConfig<{ ultimoAviso: string | null }>(userId, 'reenganche', {
			ultimoAviso: null
		});
		expect(estado.ultimoAviso).toBeNull();
	});

	it('el reenganche avisa a los 14 días de silencio, una vez por semana', async () => {
		const { evaluarReenganche } = await import('./reenganche');
		const { leerConfig } = await import('$lib/server/config');

		// Deja al usuario 15 días callado (todas sus entradas, al pasado).
		const hace15Dias = new Date();
		hace15Dias.setDate(hace15Dias.getDate() - 15);
		await db
			.update(schema.entradas)
			.set({ timestamp: hace15Dias })
			.where(and(eq(schema.entradas.userId, userId)));

		const mediodia = new Date(new Date().setHours(12, 0, 0, 0));
		await evaluarReenganche(mediodia);
		const estado = await leerConfig<{ ultimoAviso: string | null }>(userId, 'reenganche', {
			ultimoAviso: null
		});
		expect(estado.ultimoAviso).not.toBeNull();

		// Segunda pasada el mismo día: no repite (máximo uno por semana).
		await evaluarReenganche(new Date(mediodia.getTime() + 60_000));
		const estado2 = await leerConfig<{ ultimoAviso: string | null }>(userId, 'reenganche', {
			ultimoAviso: null
		});
		expect(estado2.ultimoAviso).toBe(estado.ultimoAviso);
	});

	it('de madrugada, el reenganche se calla aunque toque', async () => {
		const { evaluarReenganche } = await import('./reenganche');
		const { guardarConfig, leerConfig } = await import('$lib/server/config');
		await guardarConfig(userId, 'reenganche', { ultimoAviso: null });

		await evaluarReenganche(new Date(new Date().setHours(3, 0, 0, 0)));
		const estado = await leerConfig<{ ultimoAviso: string | null }>(userId, 'reenganche', {
			ultimoAviso: null
		});
		expect(estado.ultimoAviso).toBeNull();
	});
});
