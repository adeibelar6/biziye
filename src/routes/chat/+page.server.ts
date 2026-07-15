import { configIA } from '$lib/server/config';
import { proveedorConfigurado } from '$lib/server/ia';
import {
	borrarConversacion,
	listarConversaciones,
	mensajesDeConversacion
} from '$lib/server/ia/chat';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const usuario = locals.usuario!;
	const config = await configIA(usuario.id);
	const conversaciones = await listarConversaciones(usuario.id);

	const conversacionId = url.searchParams.get('c');
	let actual = null;
	if (conversacionId) {
		actual = await mensajesDeConversacion(usuario.id, conversacionId);
	}

	return {
		iaActiva: config.activa,
		proveedor: proveedorConfigurado(),
		conversaciones,
		actual: actual
			? {
					id: actual.conversacion.id,
					titulo: actual.conversacion.titulo,
					mensajes: actual.mensajes.map((m) => ({
						id: m.id,
						rol: m.rol,
						contenido: m.contenido
					}))
				}
			: null
	};
};

export const actions: Actions = {
	borrar: async ({ request, locals }) => {
		const datos = await request.formData();
		const id = String(datos.get('id') ?? '');
		if (id) await borrarConversacion(locals.usuario!.id, id);
		redirect(303, '/chat');
	}
};
