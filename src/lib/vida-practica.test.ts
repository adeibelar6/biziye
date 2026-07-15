import { describe, expect, it } from 'vitest';
import {
	costeAnual,
	costeAnualTotal,
	diasDeEnfriamientoRestantes,
	estadoEfectivoDeseo,
	proximaRenovacionEfectiva,
	saldosPrestamos
} from './vida-practica';

describe('suscripciones', () => {
	it('coste anual según periodicidad', () => {
		expect(costeAnual(12.99, 'mensual')).toBeCloseTo(155.88);
		expect(costeAnual(30, 'trimestral')).toBe(120);
		expect(costeAnual(90, 'anual')).toBe(90);
	});

	it('el total anual suma solo las activas', () => {
		const total = costeAnualTotal([
			{ nombre: 'Netflix', precio: 12.99, periodicidad: 'mensual', activa: true },
			{ nombre: 'Gimnasio', precio: 35, periodicidad: 'mensual' }, // sin campo => activa
			{ nombre: 'Vieja', precio: 99, periodicidad: 'anual', activa: false }
		]);
		expect(total).toBeCloseTo(12.99 * 12 + 35 * 12);
	});

	it('la próxima renovación efectiva sale del pasado avanzando periodos', () => {
		const ahora = new Date(2026, 6, 15, 12, 0);
		const efectiva = proximaRenovacionEfectiva(
			{ proxima_renovacion: '2026-03-10', periodicidad: 'mensual' },
			ahora
		);
		// El 10 de julio ya pasó (hoy es 15): la efectiva es el 10 de agosto.
		expect(efectiva?.getMonth()).toBe(7);
		expect(efectiva?.getDate()).toBe(10);
		expect(efectiva && efectiva >= ahora).toBe(true);

		const futura = proximaRenovacionEfectiva(
			{ proxima_renovacion: '2026-09-01', periodicidad: 'anual' },
			ahora
		);
		expect(futura?.getMonth()).toBe(8);
		expect(futura?.getFullYear()).toBe(2026);
	});
});

describe('deseos (enfriamiento de 30 días)', () => {
	const creado = new Date(2026, 6, 1, 20, 0);

	it('cuenta atrás correcta', () => {
		expect(diasDeEnfriamientoRestantes(creado, new Date(2026, 6, 1, 23, 0))).toBe(30);
		expect(diasDeEnfriamientoRestantes(creado, new Date(2026, 6, 16))).toBe(15);
		expect(diasDeEnfriamientoRestantes(creado, new Date(2026, 6, 31))).toBe(0);
		expect(diasDeEnfriamientoRestantes(creado, new Date(2026, 8, 1))).toBe(0);
	});

	it('a los 30 días pasa a disponible; antes, ni hablar', () => {
		expect(estadoEfectivoDeseo({ estado: 'enfriando' }, creado, new Date(2026, 6, 29))).toBe(
			'enfriando'
		);
		expect(estadoEfectivoDeseo({ estado: 'enfriando' }, creado, new Date(2026, 6, 31))).toBe(
			'disponible'
		);
		// Los estados finales no se tocan.
		expect(estadoEfectivoDeseo({ estado: 'comprado' }, creado, new Date(2026, 8, 1))).toBe(
			'comprado'
		);
	});
});

describe('préstamos', () => {
	it('saldos por persona y neto, ignorando lo devuelto', () => {
		const { porPersona, neto } = saldosPrestamos([
			{ persona: 'Mikel', importe: 50, direccion: 'preste' },
			{ persona: 'Mikel', importe: 20, direccion: 'preste', devuelto: true },
			{ persona: 'Ane', importe: 100, direccion: 'me_prestaron' },
			{ persona: 'Ane', importe: 30, direccion: 'preste' }
		]);
		expect(porPersona.find((p) => p.persona === 'Mikel')?.saldo).toBe(50);
		expect(porPersona.find((p) => p.persona === 'Ane')?.saldo).toBe(-70);
		expect(neto).toBe(-20);
	});
});
