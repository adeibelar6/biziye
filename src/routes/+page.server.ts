import {
	contarEntradas,
	listarTareasPendientes,
	metricaDelDia,
	pildoraDelPasado
} from '$lib/server/entradas';
import { avisosProximos } from '$lib/server/recordatorios/motor';
import { generarBriefing } from '$lib/server/ia/generar';
import { configIA } from '$lib/server/config';
import { diaLocal, horaLocal, saludoSegunHora } from '$lib/fechas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const usuario = locals.usuario!;
	const hoy = diaLocal();
	const inicioDia = new Date(`${hoy}T00:00:00`);
	const hora = horaLocal();

	const [metrica, tareas, pildora, entradasHoy, inbox, cierresHoy, ia, avisos, briefing] =
		await Promise.all([
			metricaDelDia(usuario.id, hoy),
			listarTareasPendientes(usuario.id, 8),
			pildoraDelPasado(usuario.id),
			contarEntradas(usuario.id, { desde: inicioDia }),
			contarEntradas(usuario.id, { tipo: 'sin_clasificar' }),
			contarEntradas(usuario.id, { tipo: 'nota', tag: 'cierre', desde: inicioDia }),
			configIA(usuario.id),
			avisosProximos(usuario.id, 30, 4),
			// Cacheado por día en config: la primera visita lo genera, el resto lo lee.
			generarBriefing(usuario.id).catch(() => null)
		]);

	return {
		saludo: saludoSegunHora(hora),
		nombre: usuario.nombre,
		metricas: (metrica?.payload ?? {}) as { animo?: number; energia?: number; sueno?: number },
		tareas,
		pildora,
		entradasHoy,
		inbox,
		avisos,
		briefing,
		// El cierre se ofrece por la tarde-noche, si la IA está activa y aún no se hizo.
		ofrecerCierre: ia.activa && hora >= 19 && cierresHoy === 0
	};
};
