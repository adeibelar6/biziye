import { describe, expect, it } from 'vitest';
import { diaLocal } from '$lib/fechas';
import { proveedorMock } from './mock';
import type { HerramientaIA } from './tipos';

describe('clasificador mock', () => {
	it('detecta gastos con importe y categoría', async () => {
		const resultado = await proveedorMock.clasificar('he pagado 12,50 € de gasolina');
		expect(resultado?.tipo).toBe('gasto');
		expect(resultado?.payload.importe).toBe(12.5);
		expect(resultado?.payload.categoria).toBe('transporte');
		expect(resultado?.confianza).toBeGreaterThanOrEqual(0.6);
	});

	it('detecta tareas por verbo de arranque', async () => {
		const resultado = await proveedorMock.clasificar('comprar pilas para el mando');
		expect(resultado?.tipo).toBe('tarea');
		expect(resultado?.payload.hecha).toBe(false);
	});

	it('detecta fallos', async () => {
		const resultado = await proveedorMock.clasificar('la he liado en la reunión por no prepararla');
		expect(resultado?.tipo).toBe('fallo');
	});

	it('detecta logros', async () => {
		const resultado = await proveedorMock.clasificar('por fin he terminado el informe y lo bordé');
		expect(resultado?.tipo).toBe('logro');
	});

	it('detecta recomendaciones de cine con recomendador', async () => {
		const resultado = await proveedorMock.clasificar('Ana me recomendó Dune');
		expect(resultado?.tipo).toBe('pelicula');
		expect(resultado?.payload.titulo).toBe('Dune');
		expect(resultado?.payload.recomendador).toBe('Ana');
		expect(resultado?.payload.estado).toBe('pendiente');
	});

	it('detecta primeras veces', async () => {
		const resultado = await proveedorMock.clasificar('primera vez que hago pan en casa');
		expect(resultado?.tipo).toBe('primera_vez');
	});

	it('detecta eventos dictados con día y hora', async () => {
		const resultado = await proveedorMock.clasificar(
			'Lo primero, apunta que hoy tengo reunion de fluxu, seguramente a las 21:00 o por ahi.'
		);
		expect(resultado?.tipo).toBe('evento');
		expect(resultado?.payload.nombre).toBe('Reunion de fluxu');
		expect(resultado?.payload.fecha).toBe(diaLocal());
		expect(resultado?.payload.hora).toBe('21:00');
	});

	it('la cita-agenda es evento; la reunión donde la liaste, fallo', async () => {
		const cita = await proveedorMock.clasificar('mañana tengo cita con el médico a las 10');
		expect(cita?.tipo).toBe('evento');
		const fallo = await proveedorMock.clasificar('la he liado en la reunión por no prepararla');
		expect(fallo?.tipo).toBe('fallo');
	});

	it('cuando no hay señal clara, devuelve null (inbox)', async () => {
		expect(await proveedorMock.clasificar('hoy el cielo estaba raro')).toBeNull();
	});
});

describe('chat mock', () => {
	function herramientasEspia(): { herramientas: HerramientaIA[]; llamadas: string[] } {
		const llamadas: string[] = [];
		const espia = (nombre: string): HerramientaIA => ({
			nombre,
			descripcion: nombre,
			parametros: {},
			ejecutar: async (argumentos) => {
				llamadas.push(`${nombre}:${JSON.stringify(argumentos)}`);
				return `respuesta-de-${nombre}`;
			}
		});
		return {
			herramientas: [
				espia('buscar_entradas'),
				espia('resumen_gastos'),
				espia('cine'),
				espia('tareas_pendientes'),
				espia('crear_entrada')
			],
			llamadas
		};
	}

	it('«apunta que…» captura vía crear_entrada', async () => {
		const { herramientas, llamadas } = herramientasEspia();
		await proveedorMock.chat(
			[{ rol: 'usuario', contenido: 'Apunta que he pagado 12 € del gimnasio' }],
			herramientas
		);
		expect(llamadas.some((l) => l.startsWith('crear_entrada'))).toBe(true);
		expect(llamadas[0]).toContain('gimnasio');
	});

	it('pregunta de gastos usa resumen_gastos', async () => {
		const { herramientas, llamadas } = herramientasEspia();
		await proveedorMock.chat(
			[{ rol: 'usuario', contenido: '¿Cuánto he gastado este mes?' }],
			herramientas
		);
		expect(llamadas.some((l) => l.startsWith('resumen_gastos'))).toBe(true);
	});

	it('«qué veo esta noche» usa la herramienta de cine', async () => {
		const { herramientas, llamadas } = herramientasEspia();
		await proveedorMock.chat(
			[{ rol: 'usuario', contenido: '¿Qué veo esta noche?' }],
			herramientas
		);
		expect(llamadas.some((l) => l.startsWith('cine'))).toBe(true);
	});

	it('«qué me recomendó Ana» filtra por recomendadora', async () => {
		const { herramientas, llamadas } = herramientasEspia();
		await proveedorMock.chat(
			[{ rol: 'usuario', contenido: '¿Qué pelis me recomendó Ana?' }],
			herramientas
		);
		expect(llamadas.some((l) => l.startsWith('cine') && l.includes('Ana'))).toBe(true);
	});
});

describe('generación mock', () => {
	it('el cierre del día pregunta por el fallo registrado', async () => {
		const texto = await proveedorMock.generar(
			'cierre_dia',
			JSON.stringify({ fallos: ['grité en la reunión'], totalEntradas: 3 })
		);
		expect(texto).toContain('grité en la reunión');
		const preguntas = texto.split('\n').filter(Boolean);
		expect(preguntas.length).toBeGreaterThanOrEqual(2);
		expect(preguntas.length).toBeLessThanOrEqual(3);
	});

	it('el informe mensual incluye totales y dinero', async () => {
		const texto = await proveedorMock.generar(
			'informe_mensual',
			JSON.stringify({
				mes: 'julio 2026',
				totalEntradas: 42,
				gastoTotal: 310.5,
				porCategoria: { comida: 200, ocio: 110.5 },
				fallos: ['uno'],
				logros: ['dos', 'tres']
			})
		);
		expect(texto).toContain('42');
		expect(texto).toContain('310.50');
		expect(texto).toContain('comida');
	});
});
