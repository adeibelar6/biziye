import { env } from '$env/dynamic/private';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export * as tablas from './schema';

/**
 * Tipo común para las dos variantes de base de datos:
 * - PostgreSQL real (DATABASE_URL definida) — docker compose / producción.
 * - PGlite (PostgreSQL embebido en ./data/pglite) — dev sin Docker.
 * Ambas hablan el mismo SQL y usan el mismo esquema Drizzle.
 */
export type BD = PgDatabase<PgQueryResultHKT, typeof schema>;

const almacenGlobal = globalThis as unknown as { __biziyeBD?: BD };

let instancia: BD | undefined = almacenGlobal.__biziyeBD;

export async function inicializarBD(): Promise<BD> {
	if (instancia) return instancia;

	if (env.DATABASE_URL) {
		const { default: pg } = await import('pg');
		const { drizzle } = await import('drizzle-orm/node-postgres');
		const { migrate } = await import('drizzle-orm/node-postgres/migrator');
		const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
		const db = drizzle(pool, { schema });
		await migrate(db, { migrationsFolder: 'drizzle' });
		instancia = db as unknown as BD;
	} else {
		const { PGlite } = await import('@electric-sql/pglite');
		const { drizzle } = await import('drizzle-orm/pglite');
		const { migrate } = await import('drizzle-orm/pglite/migrator');
		const { mkdirSync } = await import('node:fs');
		const directorio = env.PGLITE_DIR || 'data/pglite';
		mkdirSync(directorio, { recursive: true });
		// PGlite es monoproceso: dos procesos sobre el mismo directorio lo corrompen.
		const { bloquearDirectorioPglite } = await import('./candado-pglite');
		bloquearDirectorioPglite(directorio);
		const cliente = new PGlite(directorio);
		const db = drizzle(cliente, { schema });
		await migrate(db, { migrationsFolder: 'drizzle' });
		instancia = db as unknown as BD;
	}

	almacenGlobal.__biziyeBD = instancia;
	return instancia;
}

/** Acceso a la BD ya inicializada (hooks.server.ts la inicializa al arrancar). */
export function bd(): BD {
	if (!instancia) {
		throw new Error('La base de datos no está inicializada todavía.');
	}
	return instancia;
}
