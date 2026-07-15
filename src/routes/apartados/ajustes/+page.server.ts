import { fail, redirect } from '@sveltejs/kit';
import { cambiarContrasena, cerrarSesion, verificarCredenciales } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	contrasena: async ({ request, locals }) => {
		const datos = await request.formData();
		const actual = String(datos.get('actual') ?? '');
		const nueva = String(datos.get('nueva') ?? '');
		const repetida = String(datos.get('repetida') ?? '');

		if (nueva.length < 8) {
			return fail(400, { seccion: 'contrasena', error: 'La nueva necesita al menos 8 caracteres.' });
		}
		if (nueva !== repetida) {
			return fail(400, { seccion: 'contrasena', error: 'Las dos contraseñas no coinciden.' });
		}
		const valida = await verificarCredenciales(actual);
		if (!valida) {
			return fail(400, { seccion: 'contrasena', error: 'La contraseña actual no es correcta.' });
		}

		await cambiarContrasena(locals.usuario!.id, nueva);
		return { seccion: 'contrasena', hecho: 'Contraseña cambiada.' };
	},

	salir: async ({ cookies }) => {
		const token = cookies.get('biziye_sesion');
		if (token) await cerrarSesion(token);
		cookies.delete('biziye_sesion', { path: '/' });
		redirect(303, '/login');
	}
};
