import { json } from '@sveltejs/kit';
import { borrarSuscripcion, contarSuscripciones, guardarSuscripcion } from '$lib/server/push';
import type { RequestHandler } from './$types';

/** Alta y baja de suscripciones Web Push del dispositivo actual. */

export const POST: RequestHandler = async ({ request, locals }) => {
	const cuerpo = await request.json().catch(() => null);
	const s = cuerpo?.suscripcion;
	if (
		!s ||
		typeof s.endpoint !== 'string' ||
		typeof s.keys?.p256dh !== 'string' ||
		typeof s.keys?.auth !== 'string'
	) {
		return json({ error: 'Suscripción inválida.' }, { status: 400 });
	}
	await guardarSuscripcion(locals.usuario!.id, s);
	return json({ ok: true, dispositivos: await contarSuscripciones(locals.usuario!.id) });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const cuerpo = await request.json().catch(() => null);
	if (typeof cuerpo?.endpoint !== 'string') {
		return json({ error: 'Falta el endpoint.' }, { status: 400 });
	}
	await borrarSuscripcion(locals.usuario!.id, cuerpo.endpoint);
	return json({ ok: true, dispositivos: await contarSuscripciones(locals.usuario!.id) });
};
