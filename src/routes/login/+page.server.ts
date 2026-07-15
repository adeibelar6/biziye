import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	crearSesion,
	crearUsuarioInicial,
	hayUsuario,
	loginBloqueado,
	verificarCredenciales
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { primeraVez: !(await hayUsuario()) };
};

function ponerCookieSesion(
	cookies: import('@sveltejs/kit').Cookies,
	token: string,
	expiraEn: Date
) {
	cookies.set('biziye_sesion', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: env.COOKIE_SEGURA === 'true',
		expires: expiraEn
	});
}

export const actions: Actions = {
	crear: async ({ request, cookies }) => {
		if (await hayUsuario()) {
			return fail(400, { error: 'Ya existe una cuenta. Entra con tu contraseña.' });
		}
		const datos = await request.formData();
		const nombre = String(datos.get('nombre') ?? '').trim();
		const contrasena = String(datos.get('contrasena') ?? '');
		const repetida = String(datos.get('repetida') ?? '');

		if (contrasena.length < 8) {
			return fail(400, { error: 'La contraseña necesita al menos 8 caracteres.' });
		}
		if (contrasena !== repetida) {
			return fail(400, { error: 'Las dos contraseñas no coinciden.' });
		}

		const userId = await crearUsuarioInicial(nombre, contrasena);
		const { token, expiraEn } = await crearSesion(userId);
		ponerCookieSesion(cookies, token, expiraEn);
		redirect(303, '/');
	},

	entrar: async ({ request, cookies }) => {
		const segundosBloqueo = loginBloqueado();
		if (segundosBloqueo > 0) {
			return fail(429, {
				error: `Demasiados intentos. Espera ${segundosBloqueo} segundos.`
			});
		}
		const datos = await request.formData();
		const contrasena = String(datos.get('contrasena') ?? '');
		const usuario = await verificarCredenciales(contrasena);
		if (!usuario) {
			return fail(400, { error: 'Contraseña incorrecta.' });
		}
		const { token, expiraEn } = await crearSesion(usuario.id);
		ponerCookieSesion(cookies, token, expiraEn);
		redirect(303, '/');
	}
};
