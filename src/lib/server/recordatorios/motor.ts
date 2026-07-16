import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';
import { enviarPushAlUsuario } from '$lib/server/push';
import { finDeEnfriamiento, siguienteAviso, HORA_AVISO, type Regla } from '$lib/recurrencias';
import { formatearEuros } from '$lib/tipos';
import { diaLocal, fechaCorta } from '$lib/fechas';
import type { Evaluador } from './cron';

/**
 * Motor de recordatorios: la pieza transversal de la vida práctica.
 * Cada entrada que implica un aviso (suscripción, vencimiento, tarea con
 * fecha, deseo enfriándose) mantiene UNA fila espejo en `recordatorios`,
 * sincronizada en cada escritura desde la capa de datos. El cron evalúa
 * `proximo_aviso` y dispara Web Push.
 *
 * IMPORTANTE: este módulo no importa `entradas.ts` (es entradas.ts quien
 * llama aquí); toca la tabla directamente cuando lo necesita.
 */

export {
	avanzarPeriodo,
	finDeEnfriamiento,
	instanteAviso,
	siguienteAviso,
	ENFRIAMIENTO_DIAS,
	type Regla
} from '$lib/recurrencias';

/** 'YYYY-MM-DD' del payload → Date local a las 09:00, o null si no vale. */
function fechaDePayload(valor: unknown): Date | null {
	if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
	const fecha = new Date(`${valor}T0${HORA_AVISO}:00:00`);
	return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// ── Sincronización entrada → recordatorio ────────────────────────────────────

type EntradaSincronizable = {
	id: string;
	userId: string;
	tipo: string;
	timestamp: Date;
	payload: unknown;
	borradoEn: Date | null;
};

type Deseado = {
	titulo: string;
	cuerpo: string | null;
	tipo: string;
	fechaObjetivo: Date;
	regla: Regla;
	antelacionDias: number;
	payload: Record<string, unknown>;
};

function recordatorioDeseado(entrada: EntradaSincronizable): Deseado | null {
	if (entrada.borradoEn) return null;
	const p = (entrada.payload ?? {}) as Record<string, unknown>;

	if (entrada.tipo === 'suscripcion') {
		if (p.activa === false) return null;
		const fecha = fechaDePayload(p.proxima_renovacion);
		if (!fecha) return null;
		const regla = (['mensual', 'trimestral', 'anual'] as const).includes(
			p.periodicidad as 'mensual' | 'trimestral' | 'anual'
		)
			? (p.periodicidad as Regla)
			: 'mensual';
		const precio = Number(p.precio);
		return {
			titulo: `«${p.nombre ?? 'Suscripción'}» se renueva pronto`,
			cuerpo:
				(Number.isFinite(precio) ? `${formatearEuros(precio)}. ` : '') +
				'Si ya no la usas, este es el momento de cortarla.',
			tipo: 'suscripcion',
			fechaObjetivo: fecha,
			regla,
			antelacionDias: Math.max(0, Number(p.aviso_dias) || 3),
			payload: { url: '/apartados/suscripciones' }
		};
	}

	if (entrada.tipo === 'vencimiento') {
		const fecha = fechaDePayload(p.fecha);
		if (!fecha) return null;
		return {
			titulo: `«${p.nombre ?? 'Algo'}» vence el ${fechaCorta(fecha)}`,
			cuerpo: typeof p.notas === 'string' && p.notas ? p.notas : 'Muévelo antes de que caduque.',
			tipo: 'vencimiento',
			fechaObjetivo: fecha,
			regla: 'unica',
			antelacionDias: Math.max(0, Number(p.antelacion_dias) || 30),
			payload: { url: '/apartados/vencimientos' }
		};
	}

	if (entrada.tipo === 'tarea') {
		if (p.hecha === true) return null;
		const fecha = fechaDePayload(p.recordatorio_en);
		if (!fecha) return null;
		return {
			titulo: `Tarea: ${p.texto ?? ''}`.trim(),
			cuerpo: 'Te pediste este aviso. Hazla o reprográmala.',
			tipo: 'tarea',
			fechaObjetivo: fecha,
			regla: 'unica',
			antelacionDias: 0,
			payload: { url: '/apartados/tareas' }
		};
	}

	if (entrada.tipo === 'evento') {
		const fecha = fechaDePayload(p.fecha);
		if (!fecha) return null;
		const hora = typeof p.hora === 'string' ? p.hora.match(/^(\d{1,2}):(\d{2})$/) : null;
		if (hora) fecha.setHours(Number(hora[1]), Number(hora[2]), 0, 0);
		return {
			titulo: `${p.nombre ?? 'Evento'}${hora ? ` a las ${hora[1]}:${hora[2]}` : ''}`,
			cuerpo:
				`Lo tienes el ${fechaCorta(fecha)}` +
				(typeof p.lugar === 'string' && p.lugar ? ` en ${p.lugar}` : '') +
				'.',
			tipo: 'evento',
			fechaObjetivo: fecha,
			regla: 'unica',
			antelacionDias: 0,
			payload: { url: `/entrada/${entrada.id}` }
		};
	}

	if (entrada.tipo === 'deseo') {
		if (p.estado !== 'enfriando') return null;
		return {
			titulo: `30 días después: ¿sigues queriendo «${p.nombre ?? 'eso'}»?`,
			cuerpo: 'El enfriamiento terminó. Cómpralo con cabeza o apúntate el ahorro.',
			tipo: 'deseo',
			fechaObjetivo: finDeEnfriamiento(entrada.timestamp),
			regla: 'unica',
			antelacionDias: 0,
			payload: { url: '/apartados/deseos', entradaTipo: 'deseo' }
		};
	}

	return null;
}

/**
 * Mantiene el espejo en `recordatorios` de una entrada recién escrita.
 * Idempotente: una fila por entrada, se crea/actualiza/desactiva según toque.
 */
export async function sincronizarRecordatorioDeEntrada(
	entrada: EntradaSincronizable
): Promise<void> {
	const deseado = recordatorioDeseado(entrada);
	const [existente] = await bd()
		.select({ id: tablas.recordatorios.id })
		.from(tablas.recordatorios)
		.where(eq(tablas.recordatorios.entradaId, entrada.id))
		.limit(1);

	if (!deseado) {
		if (existente) {
			await bd().delete(tablas.recordatorios).where(eq(tablas.recordatorios.id, existente.id));
		}
		return;
	}

	let proximo = siguienteAviso(deseado.fechaObjetivo, deseado.regla, deseado.antelacionDias);
	// Aviso que ya quedó atrás pero cuyo hecho sigue vigente (deseo enfriado,
	// vencimiento a menos días que la antelación, tarea con fecha de hoy):
	// no nace mudo, dispara en el siguiente tic del cron.
	if (
		!proximo &&
		(deseado.tipo === 'deseo' || diaLocal(deseado.fechaObjetivo) >= diaLocal())
	) {
		proximo = { fechaObjetivo: deseado.fechaObjetivo, proximoAviso: new Date() };
	}
	const valores = {
		userId: entrada.userId,
		entradaId: entrada.id,
		titulo: deseado.titulo,
		cuerpo: deseado.cuerpo,
		tipo: deseado.tipo,
		fechaObjetivo: proximo?.fechaObjetivo ?? deseado.fechaObjetivo,
		regla: deseado.regla,
		antelacionDias: deseado.antelacionDias,
		proximoAviso: proximo?.proximoAviso ?? null,
		// Sin próximo aviso (p. ej. vencimiento ya pasado) la fila queda apagada.
		activo: proximo !== null,
		payload: deseado.payload
	};

	if (existente) {
		await bd()
			.update(tablas.recordatorios)
			.set(valores)
			.where(eq(tablas.recordatorios.id, existente.id));
	} else {
		await bd().insert(tablas.recordatorios).values(valores);
	}
}

// ── Evaluador del cron ───────────────────────────────────────────────────────

/**
 * Dispara los avisos vencidos. Idempotente: cada disparo o apaga la fila
 * (regla única) o empuja proximo_aviso al futuro (recurrente), así que
 * ejecutarlo de más nunca duplica notificaciones.
 */
export async function dispararAvisosPendientes(ahora: Date = new Date()): Promise<number> {
	const vencidos = await bd()
		.select()
		.from(tablas.recordatorios)
		.where(
			and(eq(tablas.recordatorios.activo, true), lte(tablas.recordatorios.proximoAviso, ahora))
		)
		.limit(25);

	let disparados = 0;
	for (const r of vencidos) {
		const url = String((r.payload as Record<string, unknown>)?.url ?? '/');
		await enviarPushAlUsuario(r.userId, {
			titulo: r.titulo,
			cuerpo: r.cuerpo ?? undefined,
			url,
			etiqueta: `recordatorio-${r.id}`
		});
		disparados++;

		// Un deseo que termina de enfriarse pasa solo a «listo para decidir».
		if (r.tipo === 'deseo' && r.entradaId) {
			await bd()
				.update(tablas.entradas)
				.set({
					payload: sql`jsonb_set(${tablas.entradas.payload}, '{estado}', '"disponible"')`,
					editadoEn: ahora
				})
				.where(
					and(
						eq(tablas.entradas.id, r.entradaId),
						sql`${tablas.entradas.payload}->>'estado' = 'enfriando'`
					)
				);
		}

		const siguiente =
			r.regla === 'unica'
				? null
				: siguienteAviso(r.fechaObjetivo, r.regla as Regla, r.antelacionDias, ahora);
		await bd()
			.update(tablas.recordatorios)
			.set(
				siguiente
					? {
							ultimoDisparo: ahora,
							fechaObjetivo: siguiente.fechaObjetivo,
							proximoAviso: siguiente.proximoAviso
						}
					: { ultimoDisparo: ahora, proximoAviso: null, activo: false }
			)
			.where(eq(tablas.recordatorios.id, r.id));
	}
	return disparados;
}

export const evaluadorRecordatorios: Evaluador = {
	nombre: 'recordatorios',
	async ejecutar() {
		await dispararAvisosPendientes();
	}
};

// ── Consultas para la interfaz (Hoy, apartados) ──────────────────────────────

export type AvisoProximo = {
	id: string;
	entradaId: string | null;
	titulo: string;
	tipo: string;
	fechaObjetivo: Date;
	url: string;
};

/**
 * Avisos con el hecho todavía por llegar y a menos de `dias` vista, para el
 * briefing de Hoy. No exige `activo`: un vencimiento ya notificado sigue
 * siendo un aviso a la vista hasta que su fecha pase.
 */
export async function avisosProximos(
	userId: string,
	dias = 30,
	limite = 5
): Promise<AvisoProximo[]> {
	const horizonte = new Date();
	horizonte.setDate(horizonte.getDate() + dias);
	const inicioHoy = new Date(`${diaLocal()}T00:00:00`);
	const filas = await bd()
		.select()
		.from(tablas.recordatorios)
		.where(
			and(
				eq(tablas.recordatorios.userId, userId),
				gte(tablas.recordatorios.fechaObjetivo, inicioHoy),
				lte(tablas.recordatorios.fechaObjetivo, horizonte)
			)
		)
		.orderBy(tablas.recordatorios.fechaObjetivo)
		.limit(limite);
	return filas.map((r) => ({
		id: r.id,
		entradaId: r.entradaId,
		titulo: r.titulo,
		tipo: r.tipo,
		fechaObjetivo: r.fechaObjetivo,
		url: String((r.payload as Record<string, unknown>)?.url ?? '/')
	}));
}
