import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '$lib/server/db/schema';
import type { BD } from '$lib/server/db';

/**
 * BD de pruebas: PGlite en memoria con las migraciones reales aplicadas.
 * Se registra como la instancia global que usa bd(), así los tests ejercitan
 * exactamente el mismo código que producción (mismas consultas, mismo SQL).
 */
export async function crearBDPrueba(): Promise<{ bd: BD; cerrar: () => Promise<void> }> {
	const cliente = new PGlite();
	const db = drizzle(cliente, { schema }) as unknown as BD;
	await migrate(db as never, { migrationsFolder: 'drizzle' });
	(globalThis as Record<string, unknown>).__biziyeBD = db;
	return {
		bd: db,
		cerrar: async () => {
			delete (globalThis as Record<string, unknown>).__biziyeBD;
			await cliente.close();
		}
	};
}

export async function crearUsuarioPrueba(db: BD): Promise<string> {
	const [usuario] = await db
		.insert(schema.usuarios)
		.values({ nombre: 'Probeta', passwordHash: 'hash-de-mentira' })
		.returning({ id: schema.usuarios.id });
	return usuario.id;
}
