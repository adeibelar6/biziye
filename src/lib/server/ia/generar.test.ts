import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearBDPrueba, crearUsuarioPrueba } from '../../../pruebas/bd-prueba';
import type { BD } from '$lib/server/db';

/**
 * Fase 4: los constructores de datos de briefing/informe/revisión y el
 * perfil vivo respetan la misma regla dura de privacidad que el resto,
 * y el perfil versiona sin pisar nada. Contra PGlite real.
 */

let cerrarBD: () => Promise<void>;
let userId: string;

beforeAll(async () => {
	const prueba = await crearBDPrueba();
	cerrarBD = prueba.cerrar;
	userId = await crearUsuarioPrueba(prueba.bd as BD);

	const { crearEntrada } = await import('$lib/server/entradas');

	await crearEntrada(userId, {
		tipo: 'fallo',
		payload: { texto: 'fallo visible del mes' },
		visibleIa: true
	});
	await crearEntrada(userId, {
		tipo: 'fallo',
		payload: { texto: 'fallo secretísimo' },
		visibleIa: false
	});
	await crearEntrada(userId, {
		tipo: 'gasto',
		payload: { importe: 25, categoria: 'ocio', descripcion: 'cine' },
		visibleIa: true
	});
	await crearEntrada(userId, {
		tipo: 'gasto',
		payload: { importe: 300, categoria: 'salud', descripcion: 'gasto privado' },
		visibleIa: false
	});
	await crearEntrada(userId, {
		tipo: 'vencimiento',
		payload: {
			nombre: 'seguro secreto',
			fecha: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
		},
		visibleIa: false
	});
	await crearEntrada(userId, {
		tipo: 'tarea',
		payload: { texto: 'tarea visible pendiente' },
		visibleIa: true
	});
});

afterAll(async () => {
	await cerrarBD();
});

describe('privacidad en las generaciones de la Fase 4', () => {
	it('el briefing no ve entradas invisibles (ni sus avisos)', async () => {
		const { construirDatosBriefing } = await import('./generar');
		const datos = JSON.stringify(await construirDatosBriefing(userId));
		expect(datos).toContain('tarea visible pendiente');
		expect(datos).not.toContain('secreto');
	});

	it('el informe mensual suma solo lo visible', async () => {
		const { construirDatosInformeMensual } = await import('./generar');
		const mes = new Date().toISOString().slice(0, 7);
		const datos = await construirDatosInformeMensual(userId, mes);
		expect(datos.gastoTotal).toBe(25); // el gasto privado de 300 no cuenta
		expect(JSON.stringify(datos)).not.toContain('secretísimo');
	});

	it('la revisión semanal tampoco', async () => {
		const { construirDatosRevisionSemanal } = await import('./generar');
		const datos = await construirDatosRevisionSemanal(userId);
		expect(datos.fallos).toContain('fallo visible del mes');
		expect(datos.fallos).not.toContain('fallo secretísimo');
		expect(datos.gastoTotal).toBe(25);
	});
});

describe('perfil vivo', () => {
	it('la IA crea versiones sin ver lo invisible', async () => {
		const { actualizarPerfilConIA, perfilActual } = await import('./perfil');

		const v1 = await actualizarPerfilConIA(userId);
		expect(v1?.version).toBe(1);
		expect(v1!.contenido).toContain('fallo visible del mes');
		expect(v1!.contenido).not.toContain('secretísimo');

		const actual = await perfilActual(userId);
		expect(actual?.version).toBe(1);
	});

	it('sin nada nuevo, no fabrica versiones vacías', async () => {
		const { actualizarPerfilConIA } = await import('./perfil');
		expect(await actualizarPerfilConIA(userId)).toBeNull();
	});

	it('la edición manual es una versión nueva; las viejas siguen ahí', async () => {
		const { editarPerfil, historialPerfil, versionPerfil } = await import('./perfil');

		const v2 = await editarPerfil(userId, '# Mi perfil\n\nCorregido a mano.');
		expect(v2.version).toBe(2);
		expect(v2.motivo).toBe('edicion_manual');

		const historial = await historialPerfil(userId);
		expect(historial.map((v) => v.version)).toEqual([2, 1]);
		expect((await versionPerfil(userId, 1))?.contenido).toContain('fallo visible del mes');
	});

	it('el briefing se genera una vez por día y se cachea', async () => {
		const { generarBriefing } = await import('./generar');
		const primero = await generarBriefing(userId);
		expect(primero).toBeTruthy();
		const segundo = await generarBriefing(userId);
		expect(segundo).toBe(primero);
	});
});
