import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearBDPrueba, crearUsuarioPrueba } from '../../../pruebas/bd-prueba';
import type { BD } from '$lib/server/db';

/**
 * REGLA DURA (principio 5 de biziye.md): ninguna entrada con
 * visible_ia = false, ni de un tipo apagado en Ajustes, sale hacia ningún
 * proveedor de IA. El filtro vive en la capa de datos; estos tests lo
 * demuestran contra una base de datos PostgreSQL real (PGlite en memoria)
 * usando exactamente el mismo código que producción.
 */

let cerrarBD: () => Promise<void>;
let userId: string;

beforeAll(async () => {
	const prueba = await crearBDPrueba();
	cerrarBD = prueba.cerrar;
	userId = await crearUsuarioPrueba(prueba.bd as BD);

	const { crearEntrada } = await import('$lib/server/entradas');

	await crearEntrada(userId, {
		tipo: 'nota',
		payload: { texto: 'nota pública para la IA' },
		visibleIa: true
	});
	await crearEntrada(userId, {
		tipo: 'nota',
		payload: { texto: 'secreto absoluto que jamás debe salir' },
		visibleIa: false,
		tags: ['confidencial']
	});
	await crearEntrada(userId, {
		tipo: 'gasto',
		payload: { importe: 40, categoria: 'salud', descripcion: 'terapia' },
		visibleIa: true
	});
	await crearEntrada(userId, {
		tipo: 'fallo',
		payload: { texto: 'fallo visible' },
		visibleIa: true
	});
});

afterAll(async () => {
	await cerrarBD();
});

describe('filtro de privacidad en la capa de datos', () => {
	it('entradasParaIA nunca devuelve entradas con visible_ia = false', async () => {
		const { entradasParaIA } = await import('./datos');
		const entradas = await entradasParaIA(userId, { limite: 100 });
		expect(entradas.length).toBeGreaterThan(0);
		const textos = JSON.stringify(entradas);
		expect(textos).not.toContain('secreto absoluto');
	});

	it('ni siquiera buscándola a propósito (texto o etiqueta)', async () => {
		const { entradasParaIA } = await import('./datos');
		expect(await entradasParaIA(userId, { q: 'secreto absoluto' })).toHaveLength(0);
		expect(await entradasParaIA(userId, { tag: 'confidencial' })).toHaveLength(0);
	});

	it('la app sí la ve (el filtro es solo para la IA)', async () => {
		const { listarEntradas } = await import('$lib/server/entradas');
		const entradas = await listarEntradas(userId, { q: 'secreto absoluto' });
		expect(entradas).toHaveLength(1);
	});

	it('un tipo apagado en Ajustes desaparece entero para la IA', async () => {
		const { guardarConfig } = await import('$lib/server/config');
		const { entradasParaIA } = await import('./datos');

		await guardarConfig(userId, 'ia', { activa: true, tiposOcultos: ['gasto'] });

		const todas = await entradasParaIA(userId, { limite: 100 });
		expect(todas.some((e) => e.tipo === 'gasto')).toBe(false);
		// Y pidiéndolo explícitamente, respuesta vacía.
		expect(await entradasParaIA(userId, { tipo: 'gasto' })).toHaveLength(0);
	});

	it('las herramientas del chat tampoco ven lo oculto', async () => {
		const { herramientasParaUsuario } = await import('./herramientas');
		const herramientas = herramientasParaUsuario(userId);

		const buscar = herramientas.find((h) => h.nombre === 'buscar_entradas')!;
		const resultado = await buscar.ejecutar({ q: 'secreto' });
		expect(resultado).toContain('No hay nada');

		// resumen_gastos con el tipo gasto oculto: como si no existieran.
		const gastos = herramientas.find((h) => h.nombre === 'resumen_gastos')!;
		const resumen = await gastos.ejecutar({ desde: '2000-01-01' });
		expect(resumen).toContain('No hay gastos');
	});

	it('los datos del cierre del día tampoco cuentan lo invisible', async () => {
		const { construirDatosCierre } = await import('./generar');
		const datos = await construirDatosCierre(userId);
		expect(JSON.stringify(datos)).not.toContain('secreto absoluto');
	});

	it('con la IA apagada, no hay proveedor: nada puede salir', async () => {
		const { guardarConfig } = await import('$lib/server/config');
		const { proveedorIA } = await import('./index');

		await guardarConfig(userId, 'ia', { activa: false, tiposOcultos: [] });
		expect(await proveedorIA(userId)).toBeNull();

		const { turnoDeChat } = await import('./chat');
		const turno = await turnoDeChat(userId, 'hola');
		expect(turno.ok).toBe(false);

		// Y la app sigue funcionando: capturar sin IA cae al inbox.
		const { clasificarCaptura } = await import('./clasificar');
		expect(await clasificarCaptura(userId, 'he pagado 12 € del gimnasio')).toBeNull();
	});
});
