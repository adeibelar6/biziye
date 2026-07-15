import { fail, redirect } from '@sveltejs/kit';
import { cambiarContrasena, cerrarSesion, verificarCredenciales } from '$lib/server/auth';
import { configIA, guardarConfig } from '$lib/server/config';
import { proveedorConfigurado } from '$lib/server/ia';
import {
	clavePublicaVapid,
	contarSuscripciones,
	enviarPushAlUsuario,
	pushConfigurado
} from '$lib/server/push';
import { TIPOS } from '$lib/tipos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		ia: await configIA(locals.usuario!.id),
		proveedor: proveedorConfigurado(),
		push: {
			configurado: pushConfigurado(),
			clavePublica: clavePublicaVapid(),
			dispositivos: await contarSuscripciones(locals.usuario!.id)
		}
	};
};

export const actions: Actions = {
	ia: async ({ request, locals }) => {
		const datos = await request.formData();
		const activa = datos.has('activa');
		const tiposOcultos = datos
			.getAll('oculto')
			.map(String)
			.filter((t) => TIPOS.has(t));

		await guardarConfig(locals.usuario!.id, 'ia', { activa, tiposOcultos });
		return { seccion: 'ia', hecho: 'Preferencias de IA guardadas.' };
	},

	probarAviso: async ({ locals }) => {
		if (!pushConfigurado()) {
			return fail(400, {
				seccion: 'push',
				error: 'Faltan las claves VAPID en .env — genéralas con «npm run generar-vapid».'
			});
		}
		const enviados = await enviarPushAlUsuario(locals.usuario!.id, {
			titulo: 'Probando, probando…',
			cuerpo: 'Los avisos de BIZIYE llegan bien a este dispositivo.',
			url: '/',
			etiqueta: 'prueba'
		});
		if (enviados === 0) {
			return fail(400, {
				seccion: 'push',
				error: 'No hay ningún dispositivo suscrito todavía. Activa los avisos primero.'
			});
		}
		return { seccion: 'push', hecho: `Aviso enviado a ${enviados} dispositivo(s).` };
	},

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
