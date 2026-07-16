import { describe, expect, it } from 'vitest';
import { diaLocal } from '$lib/fechas';
import {
	categoriaGasto,
	extraerEvento,
	extraerFechaRelativa,
	extraerHora,
	extraerImporte,
	payloadDesdeTexto
} from './desde-texto';

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

describe('extraerHora', () => {
	it('entiende «a las», dos puntos y punto', () => {
		expect(extraerHora('a las 21:00 o por ahí')).toBe('21:00');
		expect(extraerHora('quedamos a las 9')).toBe('09:00');
		expect(extraerHora('reunión 17:30 en la ofi')).toBe('17:30');
		expect(extraerHora('a la 1')).toBe('01:00');
		expect(extraerHora('sin hora ninguna')).toBeUndefined();
	});

	it('no confunde importes con horas', () => {
		expect(extraerHora('he pagado 12:50 €')).toBeUndefined();
	});
});

describe('extraerFechaRelativa', () => {
	// El 15 de julio de 2026 es miércoles.
	const miercoles = new Date('2026-07-15T12:00:00');

	it('hoy, mañana y pasado mañana', () => {
		expect(extraerFechaRelativa('reunión hoy', miercoles)).toBe('2026-07-15');
		expect(extraerFechaRelativa('cita mañana', miercoles)).toBe('2026-07-16');
		expect(extraerFechaRelativa('pasado mañana quedada', miercoles)).toBe('2026-07-17');
		expect(extraerFechaRelativa('esta noche cena', miercoles)).toBe('2026-07-15');
	});

	it('días de la semana: siempre el próximo', () => {
		expect(extraerFechaRelativa('el viernes', miercoles)).toBe('2026-07-17');
		expect(extraerFechaRelativa('el miércoles', miercoles)).toBe('2026-07-22');
	});

	it('día del mes y fecha con mes', () => {
		expect(extraerFechaRelativa('el 20 tengo médico', miercoles)).toBe('2026-07-20');
		expect(extraerFechaRelativa('el 3 de septiembre', miercoles)).toBe('2026-09-03');
		// Un día ya pasado salta al mes (o año) siguiente.
		expect(extraerFechaRelativa('el 10 revisión', miercoles)).toBe('2026-08-10');
		expect(extraerFechaRelativa('el 2 de enero', miercoles)).toBe('2027-01-02');
	});

	it('sin señal temporal, nada', () => {
		expect(extraerFechaRelativa('reunión de fluxu', miercoles)).toBeUndefined();
	});
});

describe('extraerEvento', () => {
	const miercoles = new Date('2026-07-15T12:00:00');

	it('la frase dictada entera: nombre limpio, hoy y hora', () => {
		const evento = extraerEvento(
			'Lo primero, apunta que hoy tengo reunion de fluxu, seguramente a las 21:00 o por ahi.',
			miercoles
		);
		expect(evento).toEqual({ nombre: 'Reunion de fluxu', fecha: '2026-07-15', hora: '21:00' });
	});

	it('solo hora: asume hoy', () => {
		const evento = extraerEvento('cita con el fisio a las 17:30', miercoles);
		expect(evento?.fecha).toBe(diaLocal(miercoles));
		expect(evento?.hora).toBe('17:30');
	});

	it('solo fecha: evento sin hora', () => {
		const evento = extraerEvento('el viernes reunión con Ane', miercoles);
		expect(evento).toEqual({ nombre: 'Reunión con Ane', fecha: '2026-07-17' });
	});

	it('sin fecha ni hora, null (que decida otro tipo)', () => {
		expect(extraerEvento('reunión de fluxu', miercoles)).toBeNull();
	});
});

describe('payloadDesdeTexto', () => {
	it('evento: saca nombre, fecha y hora del texto', () => {
		const payload = payloadDesdeTexto('evento', 'mañana dentista a las 9');
		expect(payload).toMatchObject({ nombre: 'Dentista', hora: '09:00' });
	});

	it('evento sin señal temporal: al inbox', () => {
		expect(payloadDesdeTexto('evento', 'reunión de fluxu')).toBeNull();
	});

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
