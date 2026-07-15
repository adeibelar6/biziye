import {
	contarEntradas,
	listarTareasPendientes,
	metricaDelDia,
	pildoraDelPasado
} from '$lib/server/entradas';
import { diaLocal, horaLocal, saludoSegunHora } from '$lib/fechas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const usuario = locals.usuario!;
	const hoy = diaLocal();
	const inicioDia = new Date(`${hoy}T00:00:00`);

	const [metrica, tareas, pildora, entradasHoy, inbox] = await Promise.all([
		metricaDelDia(usuario.id, hoy),
		listarTareasPendientes(usuario.id, 8),
		pildoraDelPasado(usuario.id),
		contarEntradas(usuario.id, { desde: inicioDia }),
		contarEntradas(usuario.id, { tipo: 'sin_clasificar' })
	]);

	return {
		saludo: saludoSegunHora(horaLocal()),
		nombre: usuario.nombre,
		metricas: (metrica?.payload ?? {}) as { animo?: number; energia?: number; sueno?: number },
		tareas,
		pildora,
		entradasHoy,
		inbox
	};
};
