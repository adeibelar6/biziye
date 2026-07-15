import webpush from 'web-push';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { bd, tablas } from '$lib/server/db';

/**
 * Envío de Web Push (VAPID). Sin claves en .env la app funciona igual:
 * los avisos se quedan en el log del servidor en vez de llegar al móvil
 * (regla 3 del encargo: nada se bloquea por configuración externa).
 * Las claves se generan con `npm run generar-vapid`.
 */

export type Aviso = {
	titulo: string;
	cuerpo?: string;
	/** Ruta a abrir al tocar la notificación. */
	url?: string;
	/** Notificaciones con la misma etiqueta se sustituyen entre sí. */
	etiqueta?: string;
};

export function pushConfigurado(): boolean {
	return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function clavePublicaVapid(): string | null {
	return env.VAPID_PUBLIC_KEY || null;
}

export async function guardarSuscripcion(
	userId: string,
	suscripcion: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
	await bd()
		.insert(tablas.pushSubscriptions)
		.values({
			userId,
			endpoint: suscripcion.endpoint,
			p256dh: suscripcion.keys.p256dh,
			auth: suscripcion.keys.auth
		})
		.onConflictDoUpdate({
			target: tablas.pushSubscriptions.endpoint,
			set: { userId, p256dh: suscripcion.keys.p256dh, auth: suscripcion.keys.auth }
		});
}

export async function borrarSuscripcion(userId: string, endpoint: string): Promise<void> {
	await bd()
		.delete(tablas.pushSubscriptions)
		.where(
			and(
				eq(tablas.pushSubscriptions.userId, userId),
				eq(tablas.pushSubscriptions.endpoint, endpoint)
			)
		);
}

export async function contarSuscripciones(userId: string): Promise<number> {
	const filas = await bd()
		.select({ id: tablas.pushSubscriptions.id })
		.from(tablas.pushSubscriptions)
		.where(eq(tablas.pushSubscriptions.userId, userId));
	return filas.length;
}

/**
 * Envía un aviso a todos los dispositivos suscritos del usuario.
 * Devuelve a cuántos llegó. Las suscripciones muertas (404/410) se retiran.
 */
export async function enviarPushAlUsuario(userId: string, aviso: Aviso): Promise<number> {
	if (!pushConfigurado()) {
		console.log(`[push] (sin claves VAPID) Aviso para el usuario: «${aviso.titulo}»`);
		return 0;
	}

	webpush.setVapidDetails(
		env.VAPID_SUBJECT || 'mailto:biziye@localhost',
		env.VAPID_PUBLIC_KEY!,
		env.VAPID_PRIVATE_KEY!
	);

	const suscripciones = await bd()
		.select()
		.from(tablas.pushSubscriptions)
		.where(eq(tablas.pushSubscriptions.userId, userId));

	let enviados = 0;
	for (const s of suscripciones) {
		try {
			await webpush.sendNotification(
				{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
				JSON.stringify(aviso),
				{ TTL: 60 * 60 * 12 }
			);
			enviados++;
		} catch (error) {
			const codigo = (error as { statusCode?: number }).statusCode;
			if (codigo === 404 || codigo === 410) {
				// El navegador dio de baja esta suscripción: fuera.
				await borrarSuscripcion(userId, s.endpoint);
			} else {
				console.error(`[push] Falló el envío a ${s.endpoint.slice(0, 40)}…`, error);
			}
		}
	}
	return enviados;
}
