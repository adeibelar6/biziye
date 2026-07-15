import { building } from '$app/environment';
import { json, redirect, type Handle } from '@sveltejs/kit';
import { inicializarBD } from '$lib/server/db';
import { validarSesion } from '$lib/server/auth';

if (!building) {
	await inicializarBD();
	// El motor de recordatorios (cron) se engancha aquí; ver Fase 3.
	const { iniciarCron } = await import('$lib/server/recordatorios/cron');
	iniciarCron();
}

/** Rutas accesibles sin sesión. Todo lo demás exige login. */
const RUTAS_PUBLICAS = ['/login', '/offline'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('biziye_sesion');
	event.locals.usuario = token ? await validarSesion(token) : null;

	const ruta = event.url.pathname;
	const esPublica = RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith(r + '/'));

	if (!event.locals.usuario && !esPublica) {
		if (ruta.startsWith('/api')) {
			return json({ error: 'Sesión no válida' }, { status: 401 });
		}
		redirect(303, '/login');
	}

	if (event.locals.usuario && ruta === '/login') {
		redirect(303, '/');
	}

	return resolve(event);
};
