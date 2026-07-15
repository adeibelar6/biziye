import { horaLocal, saludoSegunHora } from '$lib/fechas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		saludo: saludoSegunHora(horaLocal()),
		nombre: locals.usuario?.nombre ?? ''
	};
};
