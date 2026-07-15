import { fail } from '@sveltejs/kit';
import {
	actualizarPerfilConIA,
	editarPerfil,
	historialPerfil,
	perfilActual,
	versionPerfil,
	PERFIL_INICIAL
} from '$lib/server/ia/perfil';
import { configIA } from '$lib/server/config';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.usuario!.id;
	const actual = await perfilActual(userId);

	// ?v=N enseña una versión antigua (solo lectura).
	const versionPedida = Number(url.searchParams.get('v'));
	const antigua =
		Number.isInteger(versionPedida) && actual && versionPedida !== actual.version
			? await versionPerfil(userId, versionPedida)
			: null;

	return {
		perfil: antigua ?? actual,
		esAntigua: Boolean(antigua),
		versionActual: actual?.version ?? 0,
		contenidoInicial: PERFIL_INICIAL,
		historial: (await historialPerfil(userId)).map((v) => ({
			version: v.version,
			motivo: v.motivo,
			creadoEn: v.creadoEn.toISOString()
		})),
		ia: await configIA(locals.usuario!.id)
	};
};

export const actions: Actions = {
	actualizar: async ({ locals }) => {
		const version = await actualizarPerfilConIA(locals.usuario!.id, 'manual');
		if (!version) {
			return fail(400, {
				error:
					'No se pudo actualizar: o la IA está apagada, o no hay nada nuevo desde la última versión.'
			});
		}
		return { hecho: `Perfil actualizado (versión ${version.version}).` };
	},

	editar: async ({ request, locals }) => {
		const datos = await request.formData();
		const contenido = String(datos.get('contenido') ?? '');
		if (!contenido.trim()) {
			return fail(400, { error: 'El perfil no puede quedarse vacío.' });
		}
		const version = await editarPerfil(locals.usuario!.id, contenido);
		return { hecho: `Guardado como versión ${version.version}.` };
	}
};
