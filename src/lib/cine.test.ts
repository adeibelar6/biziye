import { describe, expect, it } from 'vitest';
import {
	estadisticasPorGenero,
	notaMediaGlobal,
	ranking,
	recomendadores,
	type Titulo
} from './cine';

function titulo(payload: Record<string, unknown>, dia = 1): Titulo {
	return { id: `id-${Math.abs(JSON.stringify(payload).length)}-${dia}`, payload, timestamp: new Date(2026, 5, dia) };
}

const FILMOTECA: Titulo[] = [
	titulo({ titulo: 'Dune', estado: 'vista', nota: 8, genero: 'ciencia ficción', recomendador: 'Ana' }, 1),
	titulo({ titulo: 'El padrino', estado: 'vista', nota: 10, genero: 'drama' }, 2),
	titulo({ titulo: 'Torrente', estado: 'vista', nota: 3, genero: 'comedia', recomendador: 'Mikel' }, 3),
	titulo({ titulo: 'Alien', estado: 'vista', nota: 8, genero: 'ciencia ficción' }, 4),
	titulo({ titulo: 'Heat', estado: 'pendiente', recomendador: 'Ana' }, 5),
	titulo({ titulo: 'Sin nota', estado: 'vista', genero: 'drama' }, 6)
];

describe('ranking personal', () => {
	it('ordena vistas con nota de mejor a peor; sin nota, fuera', () => {
		const top = ranking(FILMOTECA);
		expect(top.map((t) => t.payload.titulo)).toEqual([
			'El padrino',
			'Alien', // empata con Dune a 8, pero es más reciente
			'Dune',
			'Torrente'
		]);
	});

	it('nota media global solo con lo puntuado', () => {
		expect(notaMediaGlobal(FILMOTECA)).toBeCloseTo((8 + 10 + 3 + 8) / 4);
	});
});

describe('estadísticas', () => {
	it('por género: cuenta vistas y media', () => {
		const generos = estadisticasPorGenero(FILMOTECA);
		const cifi = generos.find((g) => g.clave === 'ciencia ficción');
		expect(cifi?.vistas).toBe(2);
		expect(cifi?.notaMedia).toBe(8);
		const drama = generos.find((g) => g.clave === 'drama');
		expect(drama?.vistas).toBe(2); // una con nota, otra sin
		expect(drama?.notaMedia).toBe(10);
	});

	it('recomendadores: fiabilidad y pendientes', () => {
		const lista = recomendadores(FILMOTECA);
		const ana = lista.find((r) => r.clave === 'Ana');
		expect(ana?.vistas).toBe(1);
		expect(ana?.notaMedia).toBe(8);
		expect(ana?.pendientes).toBe(1);
		const mikel = lista.find((r) => r.clave === 'Mikel');
		expect(mikel?.notaMedia).toBe(3);
		// Ana (media 8) por delante de Mikel (media 3).
		expect(lista.indexOf(ana!)).toBeLessThan(lista.indexOf(mikel!));
	});
});
