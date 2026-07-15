import { entradasParaIA } from './datos';
import { proveedorIA } from './index';
import { leerConfig, guardarConfig } from '$lib/server/config';
import { diaLocal, diasEntre, fechaCorta } from '$lib/fechas';
import { proximaRenovacionEfectiva } from '$lib/vida-practica';
import type { Payload } from '$lib/tipos';

/**
 * Generaciones de la IA (cierre del día, briefing, informe, revisión).
 * Los datos que se envían al proveedor salen SIEMPRE de entradasParaIA
 * (filtro de privacidad en la capa de datos) — nunca de la tabla de
 * recordatorios ni de consultas sueltas.
 */

function textoDe(payload: Payload, clave = 'texto'): string {
	return String(payload[clave] ?? '');
}

function media(valores: number[]): number | undefined {
	const validos = valores.filter((v) => Number.isFinite(v) && v > 0);
	if (validos.length === 0) return undefined;
	return validos.reduce((suma, v) => suma + v, 0) / validos.length;
}

/** Datos del día (solo lo visible para la IA) para generar el cierre. */
export async function construirDatosCierre(userId: string, ahora = new Date()) {
	const inicioDia = new Date(`${diaLocal(ahora)}T00:00:00`);
	const entradas = await entradasParaIA(userId, { desde: inicioDia, limite: 100 });

	const fallos = entradas.filter((e) => e.tipo === 'fallo').map((e) => textoDe(e.payload));
	const logros = entradas.filter((e) => e.tipo === 'logro').map((e) => textoDe(e.payload));
	const gastoTotal = entradas
		.filter((e) => e.tipo === 'gasto')
		.reduce((suma, e) => suma + (Number(e.payload.importe) || 0), 0);
	const metrica = entradas.find((e) => e.tipo === 'metrica');
	const tareasHechas = entradas.filter(
		(e) => e.tipo === 'tarea' && e.payload.hecha === true
	).length;

	return {
		fecha: diaLocal(ahora),
		totalEntradas: entradas.length,
		fallos,
		logros,
		gastoTotal,
		animo: metrica ? Number(metrica.payload.animo) || undefined : undefined,
		tareasHechas
	};
}

/** Preguntas del cierre del día, o null si la IA está apagada. */
export async function generarCierreDelDia(userId: string): Promise<string[] | null> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) return null;

	const datos = await construirDatosCierre(userId);
	const texto = await proveedor.generar('cierre_dia', JSON.stringify(datos));
	return texto
		.split('\n')
		.map((linea) => linea.replace(/^[-*\d.\s]+/, '').trim())
		.filter(Boolean)
		.slice(0, 3);
}

// ── Briefing matinal ─────────────────────────────────────────────────────────

/**
 * Datos del briefing, salidos íntegramente de entradasParaIA: los avisos se
 * reconstruyen desde las entradas visibles (no desde la tabla de
 * recordatorios) para que un apartado oculto tampoco se cuele por aquí.
 */
export async function construirDatosBriefing(userId: string, ahora = new Date()) {
	const [tareas, suscripciones, vencimientos, metricas] = await Promise.all([
		entradasParaIA(userId, { tipo: 'tarea', limite: 50 }),
		entradasParaIA(userId, { tipo: 'suscripcion', limite: 50 }),
		entradasParaIA(userId, { tipo: 'vencimiento', limite: 50 }),
		entradasParaIA(userId, { tipo: 'metrica', limite: 3 })
	]);

	const avisos: { titulo: string; cuando: string }[] = [];
	for (const s of suscripciones) {
		if (s.payload.activa === false) continue;
		const fecha = proximaRenovacionEfectiva(s.payload, ahora);
		if (fecha && diasEntre(ahora, fecha) <= 14) {
			avisos.push({ titulo: `${s.payload.nombre} se renueva`, cuando: fechaCorta(fecha) });
		}
	}
	for (const v of vencimientos) {
		const bruto = String(v.payload.fecha ?? '');
		if (!/^\d{4}-\d{2}-\d{2}/.test(bruto)) continue;
		const fecha = new Date(`${bruto.slice(0, 10)}T12:00:00`);
		const dias = diasEntre(ahora, fecha);
		if (dias >= 0 && dias <= 30) {
			avisos.push({ titulo: `${v.payload.nombre} vence`, cuando: fechaCorta(fecha) });
		}
	}

	const ayer = new Date(ahora);
	ayer.setDate(ayer.getDate() - 1);
	const metricaAyer = metricas.find(
		(m) => (m.payload as { dia?: string }).dia === diaLocal(ayer) || diaLocal(m.timestamp) === diaLocal(ayer)
	);

	const ultima = (
		await entradasParaIA(userId, { limite: 1 })
	)[0];

	return {
		fecha: diaLocal(ahora),
		tareasPendientes: tareas
			.filter((t) => t.payload.hecha !== true)
			.slice(0, 6)
			.map((t) => textoDe(t.payload)),
		avisos: avisos.slice(0, 5),
		animoAyer: metricaAyer ? Number(metricaAyer.payload.animo) || undefined : undefined,
		suenoAyer: metricaAyer ? Number(metricaAyer.payload.sueno) || undefined : undefined,
		diasSinRegistrar: ultima ? diasEntre(ultima.timestamp, ahora) : undefined
	};
}

/**
 * Briefing del día, generado una sola vez por día natural y cacheado en
 * config (con la API real, Hoy no puede costar una llamada por visita).
 */
export async function generarBriefing(userId: string): Promise<string | null> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) return null;

	const hoy = diaLocal();
	const cacheado = await leerConfig<{ dia: string; texto: string } | null>(
		userId,
		'briefing',
		null
	);
	if (cacheado && cacheado.dia === hoy && cacheado.texto) return cacheado.texto;

	const datos = await construirDatosBriefing(userId);
	const texto = await proveedor.generar('briefing', JSON.stringify(datos));
	await guardarConfig(userId, 'briefing', { dia: hoy, texto });
	return texto;
}

// ── Informe mensual ──────────────────────────────────────────────────────────

/** Datos del informe de un mes ('YYYY-MM'), solo con lo visible para la IA. */
export async function construirDatosInformeMensual(userId: string, mes: string) {
	const inicio = new Date(`${mes}-01T00:00:00`);
	const fin = new Date(inicio);
	fin.setMonth(fin.getMonth() + 1);

	const entradas = await entradasParaIA(userId, { desde: inicio, hasta: fin, limite: 100 });

	const porTipo: Record<string, number> = {};
	for (const e of entradas) porTipo[e.tipo] = (porTipo[e.tipo] ?? 0) + 1;

	const gastos = entradas.filter((e) => e.tipo === 'gasto');
	const porCategoria: Record<string, number> = {};
	for (const g of gastos) {
		const categoria = String(g.payload.categoria || 'otros');
		porCategoria[categoria] = (porCategoria[categoria] ?? 0) + (Number(g.payload.importe) || 0);
	}

	const metricas = entradas.filter((e) => e.tipo === 'metrica');
	const vistas = entradas.filter((e) => e.tipo === 'pelicula' && e.payload.estado === 'vista');
	const mejor = [...vistas].sort(
		(a, b) => (Number(b.payload.nota) || 0) - (Number(a.payload.nota) || 0)
	)[0];

	const nombreMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(
		inicio
	);

	return {
		mes: nombreMes,
		totalEntradas: entradas.length,
		porTipo,
		gastoTotal: gastos.reduce((suma, g) => suma + (Number(g.payload.importe) || 0), 0),
		porCategoria,
		medias: {
			animo: media(metricas.map((m) => Number(m.payload.animo))),
			energia: media(metricas.map((m) => Number(m.payload.energia))),
			sueno: media(metricas.map((m) => Number(m.payload.sueno)))
		},
		fallos: entradas.filter((e) => e.tipo === 'fallo').map((e) => textoDe(e.payload)),
		logros: entradas.filter((e) => e.tipo === 'logro').map((e) => textoDe(e.payload)),
		pelisVistas: vistas.length,
		mejorPeli: mejor ? String(mejor.payload.titulo ?? '') : undefined,
		primerasVeces: entradas
			.filter((e) => e.tipo === 'primera_vez')
			.map((e) => textoDe(e.payload))
	};
}

/** Informe mensual en markdown, o null si la IA está apagada. */
export async function generarInformeMensual(userId: string, mes: string): Promise<string | null> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) return null;
	const datos = await construirDatosInformeMensual(userId, mes);
	return proveedor.generar('informe_mensual', JSON.stringify(datos));
}

// ── Revisión semanal ─────────────────────────────────────────────────────────

/** Datos de los últimos 7 días para la revisión semanal guiada. */
export async function construirDatosRevisionSemanal(userId: string, ahora = new Date()) {
	const desde = new Date(ahora);
	desde.setDate(desde.getDate() - 7);
	const entradas = await entradasParaIA(userId, { desde, limite: 100 });

	const metricas = entradas.filter((e) => e.tipo === 'metrica');
	return {
		semana: `${fechaCorta(desde)} — ${fechaCorta(ahora)}`,
		fallos: entradas.filter((e) => e.tipo === 'fallo').map((e) => textoDe(e.payload)),
		logros: entradas.filter((e) => e.tipo === 'logro').map((e) => textoDe(e.payload)),
		gastoTotal: entradas
			.filter((e) => e.tipo === 'gasto')
			.reduce((suma, e) => suma + (Number(e.payload.importe) || 0), 0),
		tareasHechas: entradas.filter((e) => e.tipo === 'tarea' && e.payload.hecha === true).length,
		medias: {
			animo: media(metricas.map((m) => Number(m.payload.animo))),
			energia: media(metricas.map((m) => Number(m.payload.energia))),
			sueno: media(metricas.map((m) => Number(m.payload.sueno)))
		}
	};
}

/** Guion de la revisión semanal (resumen + preguntas), o null sin IA. */
export async function generarRevisionSemanal(userId: string): Promise<string | null> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) return null;
	const datos = await construirDatosRevisionSemanal(userId);
	return proveedor.generar('revision_semanal', JSON.stringify(datos));
}
