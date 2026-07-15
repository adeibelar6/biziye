import { desc, eq, inArray } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';
import { diaLocal } from '$lib/fechas';
import type { RequestHandler } from './$types';

/**
 * Exportación completa en JSON: todo lo tuyo, descargable desde Ajustes.
 * Incluye también lo borrado (soft delete) marcado con borrado_en — es una
 * copia de datos, no una vista.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.usuario!.id;

	const [entradas, recordatorios, perfil, conversaciones, config] = await Promise.all([
		bd()
			.select()
			.from(tablas.entradas)
			.where(eq(tablas.entradas.userId, userId))
			.orderBy(desc(tablas.entradas.timestamp)),
		bd().select().from(tablas.recordatorios).where(eq(tablas.recordatorios.userId, userId)),
		bd()
			.select()
			.from(tablas.perfilVivo)
			.where(eq(tablas.perfilVivo.userId, userId))
			.orderBy(desc(tablas.perfilVivo.version)),
		bd()
			.select()
			.from(tablas.chatConversaciones)
			.where(eq(tablas.chatConversaciones.userId, userId)),
		bd().select().from(tablas.config).where(eq(tablas.config.userId, userId))
	]);

	const mensajes =
		conversaciones.length > 0
			? await bd()
					.select()
					.from(tablas.chatMensajes)
					.where(
						inArray(
							tablas.chatMensajes.conversacionId,
							conversaciones.map((c) => c.id)
						)
					)
			: [];

	const exportacion = {
		app: 'BIZIYE',
		version: 1,
		exportadoEn: new Date().toISOString(),
		entradas,
		recordatorios,
		perfilVivo: perfil,
		chat: { conversaciones, mensajes },
		config
	};

	return new Response(JSON.stringify(exportacion, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="biziye-${diaLocal()}.json"`
		}
	});
};
