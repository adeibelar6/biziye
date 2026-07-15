import { describe, expect, it } from 'vitest';
import { categoriaGasto, extraerImporte, payloadDesdeTexto } from './desde-texto';

describe('extraerImporte', () => {
	it('entiende comas, puntos y símbolo del euro', () => {
		expect(extraerImporte('12,50 €')).toBe(12.5);
		expect(extraerImporte('12.50')).toBe(12.5);
		expect(extraerImporte('he pagado 40 euros')).toBe(40);
		expect(extraerImporte('sin números')).toBeUndefined();
	});
});

describe('categoriaGasto', () => {
	it('adivina categorías por palabras clave', () => {
		expect(categoriaGasto('menú del día')).toBe('comida');
		expect(categoriaGasto('gasolina del coche')).toBe('transporte');
		expect(categoriaGasto('entrada del cine')).toBe('ocio');
		expect(categoriaGasto('cosa rarísima')).toBe('otros');
	});
});

describe('payloadDesdeTexto', () => {
	it('gasto: saca importe y limpia la descripción', () => {
		const payload = payloadDesdeTexto('gasto', '12,50 cañas con Jon');
		expect(payload).toMatchObject({ importe: 12.5 });
		expect(String(payload?.descripcion)).toContain('cañas');
	});

	it('gasto sin importe: imposible, que vaya al inbox', () => {
		expect(payloadDesdeTexto('gasto', 'cañas con Jon')).toBeNull();
	});

	it('tipos estructurados no se rellenan desde texto', () => {
		expect(payloadDesdeTexto('suscripcion', 'Netflix')).toBeNull();
		expect(payloadDesdeTexto('vencimiento', 'ITV')).toBeNull();
	});

	it('los tipos de texto usan su campo principal', () => {
		expect(payloadDesdeTexto('nota', 'hola')).toEqual({ texto: 'hola' });
		expect(payloadDesdeTexto('deseo', 'una tele nueva')).toMatchObject({
			nombre: 'una tele nueva',
			estado: 'enfriando'
		});
	});
});
