import { abrirPglite, cargarEnv } from './entorno.mjs';

cargarEnv();

/** Aplica las migraciones de ./drizzle a la BD configurada (pg o PGlite). */
async function migrar() {
	if (process.env.DATABASE_URL) {
		const { default: pg } = await import('pg');
		const { drizzle } = await import('drizzle-orm/node-postgres');
		const { migrate } = await import('drizzle-orm/node-postgres/migrator');
		const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
		await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
		await pool.end();
		console.log('Migraciones aplicadas sobre PostgreSQL.');
	} else {
		const { drizzle } = await import('drizzle-orm/pglite');
		const { migrate } = await import('drizzle-orm/pglite/migrator');
		const cliente = await abrirPglite();
		await migrate(drizzle(cliente), { migrationsFolder: 'drizzle' });
		await cliente.close();
		console.log(
			`Migraciones aplicadas sobre PGlite (${process.env.PGLITE_DIR || 'data/pglite'}).`
		);
	}
}

await migrar();
