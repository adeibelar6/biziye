import { desc, eq, asc } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';
import { proveedorIA } from './index';
import { herramientasParaUsuario } from './herramientas';
import type { MensajeIA } from './tipos';

/** Conversaciones y mensajes del chat, más el turno contra el proveedor. */

export async function listarConversaciones(userId: string) {
	return bd()
		.select()
		.from(tablas.chatConversaciones)
		.where(eq(tablas.chatConversaciones.userId, userId))
		.orderBy(desc(tablas.chatConversaciones.actualizadoEn))
		.limit(30);
}

export async function mensajesDeConversacion(userId: string, conversacionId: string) {
	const [conversacion] = await bd()
		.select()
		.from(tablas.chatConversaciones)
		.where(eq(tablas.chatConversaciones.id, conversacionId))
		.limit(1);
	if (!conversacion || conversacion.userId !== userId) return null;

	const mensajes = await bd()
		.select()
		.from(tablas.chatMensajes)
		.where(eq(tablas.chatMensajes.conversacionId, conversacionId))
		.orderBy(asc(tablas.chatMensajes.creadoEn))
		.limit(200);

	return { conversacion, mensajes };
}

export async function borrarConversacion(userId: string, conversacionId: string) {
	const [conversacion] = await bd()
		.select({ userId: tablas.chatConversaciones.userId })
		.from(tablas.chatConversaciones)
		.where(eq(tablas.chatConversaciones.id, conversacionId))
		.limit(1);
	if (!conversacion || conversacion.userId !== userId) return false;
	await bd()
		.delete(tablas.chatConversaciones)
		.where(eq(tablas.chatConversaciones.id, conversacionId));
	return true;
}

/**
 * Un turno de chat: guarda el mensaje del usuario, pregunta al proveedor
 * (con las herramientas de consulta filtradas por privacidad) y guarda la
 * respuesta. Crea la conversación si no existe.
 */
export async function turnoDeChat(
	userId: string,
	texto: string,
	conversacionId?: string
): Promise<
	| { ok: true; conversacionId: string; respuesta: string; herramientas: string[] }
	| { ok: false; error: string }
> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) {
		return { ok: false, error: 'ia_apagada' };
	}

	let conversacion: { id: string } | undefined;
	if (conversacionId) {
		const existente = await mensajesDeConversacion(userId, conversacionId);
		if (existente) conversacion = existente.conversacion;
	}
	if (!conversacion) {
		const titulo = texto.length > 48 ? texto.slice(0, 45) + '…' : texto;
		[conversacion] = await bd()
			.insert(tablas.chatConversaciones)
			.values({ userId, titulo })
			.returning();
	}

	await bd()
		.insert(tablas.chatMensajes)
		.values({ conversacionId: conversacion.id, rol: 'usuario', contenido: texto });

	// Historial reciente para dar contexto al proveedor.
	const previos = await bd()
		.select()
		.from(tablas.chatMensajes)
		.where(eq(tablas.chatMensajes.conversacionId, conversacion.id))
		.orderBy(desc(tablas.chatMensajes.creadoEn))
		.limit(12);

	const mensajes: MensajeIA[] = previos
		.reverse()
		.map((m) => ({ rol: m.rol as MensajeIA['rol'], contenido: m.contenido }));

	let respuesta;
	try {
		respuesta = await proveedor.chat(mensajes, herramientasParaUsuario(userId));
	} catch (error) {
		console.error('[ia] El chat falló:', error);
		return {
			ok: false,
			error: 'proveedor_caido'
		};
	}

	await bd().insert(tablas.chatMensajes).values({
		conversacionId: conversacion.id,
		rol: 'ia',
		contenido: respuesta.texto,
		meta: { herramientas: respuesta.herramientasUsadas }
	});

	await bd()
		.update(tablas.chatConversaciones)
		.set({ actualizadoEn: new Date() })
		.where(eq(tablas.chatConversaciones.id, conversacion.id));

	return {
		ok: true,
		conversacionId: conversacion.id,
		respuesta: respuesta.texto,
		herramientas: respuesta.herramientasUsadas
	};
}
