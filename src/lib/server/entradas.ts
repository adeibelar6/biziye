import { and, desc, eq, gte, ilike, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';
import { sincronizarRecordatorioDeEntrada } from '$lib/server/recordatorios/motor';
import { definicion, type Payload } from '$lib/tipos';
import { diaLocal, diaSemana, horaLocal } from '$lib/fechas';

/**
 * Capa de datos de la entrada universal. Todas las lecturas/escrituras de la
 * tabla `entradas` pasan por aquí (el filtro de privacidad de la IA se apoya
 * en esta capa, no en los prompts).
 */

export type Entrada = typeof tablas.entradas.$inferSelect;

export type FiltrosEntradas = {
	tipo?: string;
	tipos?: string[];
	tag?: string;
	q?: string;
	desde?: Date;
	hasta?: Date;
	/** Cursor de paginación: entradas estrictamente anteriores a este instante. */
	antesDe?: Date;
	limite?: number;
	/** Si es true, solo entradas visibles para la IA. Lo usa la capa de IA. */
	soloVisiblesIa?: boolean;
};

function condiciones(userId: string, filtros: FiltrosEntradas): SQL[] {
	const lista: SQL[] = [
		eq(tablas.entradas.userId, userId) as unknown as SQL,
		isNull(tablas.entradas.borradoEn) as unknown as SQL
	];
	if (filtros.tipo) lista.push(eq(tablas.entradas.tipo, filtros.tipo) as unknown as SQL);
	if (filtros.tipos && filtros.tipos.length > 0) {
		lista.push(
			sql`${tablas.entradas.tipo} in (${sql.join(
				filtros.tipos.map((t) => sql`${t}`),
				sql`, `
			)})`
		);
	}
	if (filtros.tag) {
		lista.push(sql`${filtros.tag} = any(${tablas.entradas.tags})`);
	}
	if (filtros.q) {
		const patron = `%${filtros.q}%`;
		lista.push(
			or(
				ilike(sql`${tablas.entradas.payload}::text`, patron),
				sql`exists (select 1 from unnest(${tablas.entradas.tags}) etiqueta where etiqueta ilike ${patron})`
			) as unknown as SQL
		);
	}
	if (filtros.desde) lista.push(gte(tablas.entradas.timestamp, filtros.desde) as unknown as SQL);
	if (filtros.hasta) lista.push(lte(tablas.entradas.timestamp, filtros.hasta) as unknown as SQL);
	if (filtros.antesDe) lista.push(lt(tablas.entradas.timestamp, filtros.antesDe) as unknown as SQL);
	if (filtros.soloVisiblesIa) lista.push(eq(tablas.entradas.visibleIa, true) as unknown as SQL);
	return lista;
}

export async function listarEntradas(userId: string, filtros: FiltrosEntradas = {}) {
	const limite = Math.min(filtros.limite ?? 30, 1000);
	return bd()
		.select()
		.from(tablas.entradas)
		.where(and(...condiciones(userId, filtros)))
		.orderBy(desc(tablas.entradas.timestamp), desc(tablas.entradas.id))
		.limit(limite);
}

export async function contarEntradas(userId: string, filtros: FiltrosEntradas = {}) {
	const [fila] = await bd()
		.select({ total: sql<number>`count(*)::int` })
		.from(tablas.entradas)
		.where(and(...condiciones(userId, filtros)));
	return fila?.total ?? 0;
}

export async function obtenerEntrada(userId: string, id: string): Promise<Entrada | null> {
	const [fila] = await bd()
		.select()
		.from(tablas.entradas)
		.where(
			and(
				eq(tablas.entradas.id, id),
				eq(tablas.entradas.userId, userId),
				isNull(tablas.entradas.borradoEn)
			)
		)
		.limit(1);
	return fila ?? null;
}

/** Contexto automático que acompaña a toda entrada nueva (biziye.md, 2ª ronda). */
export function contextoAutomatico(instante: Date = new Date()): Record<string, unknown> {
	return {
		dia_semana: diaSemana(instante),
		hora: horaLocal(instante)
	};
}

export async function crearEntrada(
	userId: string,
	datos: {
		id?: string;
		tipo: string;
		payload: Payload;
		tags?: string[];
		timestamp?: Date;
		visibleIa?: boolean;
		contextoExtra?: Record<string, unknown>;
	}
): Promise<Entrada> {
	const instante = datos.timestamp ?? new Date();
	const def = definicion(datos.tipo);
	const valores = {
		userId,
		tipo: datos.tipo,
		payload: datos.payload,
		tags: datos.tags ?? [],
		timestamp: instante,
		visibleIa: datos.visibleIa ?? def.visibleIaPorDefecto,
		contexto: { ...contextoAutomatico(instante), ...datos.contextoExtra }
	};

	// idCliente de la cola offline: mismo id => misma entrada (idempotente).
	if (datos.id && /^[0-9a-f-]{36}$/i.test(datos.id)) {
		const [fila] = await bd()
			.insert(tablas.entradas)
			.values({ id: datos.id, ...valores })
			.onConflictDoNothing({ target: tablas.entradas.id })
			.returning();
		if (fila) {
			await sincronizarRecordatorioDeEntrada(fila);
			return fila;
		}
		const existente = await obtenerEntrada(userId, datos.id);
		if (existente) return existente;
	}

	const [fila] = await bd().insert(tablas.entradas).values(valores).returning();
	await sincronizarRecordatorioDeEntrada(fila);
	return fila;
}

export async function editarEntrada(
	userId: string,
	id: string,
	cambios: {
		tipo?: string;
		payload?: Payload;
		tags?: string[];
		timestamp?: Date;
		visibleIa?: boolean;
	}
): Promise<Entrada | null> {
	const [fila] = await bd()
		.update(tablas.entradas)
		.set({ ...cambios, editadoEn: new Date() })
		.where(
			and(
				eq(tablas.entradas.id, id),
				eq(tablas.entradas.userId, userId),
				isNull(tablas.entradas.borradoEn)
			)
		)
		.returning();
	if (fila) await sincronizarRecordatorioDeEntrada(fila);
	return fila ?? null;
}

export async function borrarEntrada(userId: string, id: string): Promise<boolean> {
	const [fila] = await bd()
		.update(tablas.entradas)
		.set({ borradoEn: new Date() })
		.where(
			and(
				eq(tablas.entradas.id, id),
				eq(tablas.entradas.userId, userId),
				isNull(tablas.entradas.borradoEn)
			)
		)
		.returning();
	if (fila) await sincronizarRecordatorioDeEntrada(fila);
	return Boolean(fila);
}

/**
 * Métricas del día: una sola entrada tipo `metrica` por día natural
 * (Europe/Madrid). Registrar un valor crea la entrada del día o la completa.
 */
export async function registrarMetricaDiaria(
	userId: string,
	clave: 'animo' | 'energia' | 'sueno',
	valor: number
): Promise<Entrada> {
	const hoy = diaLocal();
	const existente = await metricaDelDia(userId, hoy);
	if (existente) {
		const payload = { ...(existente.payload as Payload), [clave]: valor };
		const [fila] = await bd()
			.update(tablas.entradas)
			.set({ payload, editadoEn: new Date() })
			.where(eq(tablas.entradas.id, existente.id))
			.returning();
		return fila;
	}
	return crearEntrada(userId, {
		tipo: 'metrica',
		payload: { [clave]: valor },
		contextoExtra: { dia: hoy }
	});
}

/** Tareas sin hacer, de más nueva a más vieja. */
export async function listarTareasPendientes(userId: string, limite = 20): Promise<Entrada[]> {
	return bd()
		.select()
		.from(tablas.entradas)
		.where(
			and(
				eq(tablas.entradas.userId, userId),
				eq(tablas.entradas.tipo, 'tarea'),
				isNull(tablas.entradas.borradoEn),
				sql`coalesce(${tablas.entradas.payload}->>'hecha', 'false') <> 'true'`
			)
		)
		.orderBy(desc(tablas.entradas.timestamp))
		.limit(limite);
}

/** Hash simple y estable para elegir "aleatorios" deterministas por día. */
function hashDia(semilla: string): number {
	let hash = 0;
	for (let i = 0; i < semilla.length; i++) {
		hash = (hash * 31 + semilla.charCodeAt(i)) >>> 0;
	}
	return hash;
}

/**
 * Píldora del pasado para Hoy: «tal día como hoy» (mismo día del mes, de hace
 * al menos un mes), o una frase, o un chiste. Determinista dentro del día.
 */
export async function pildoraDelPasado(
	userId: string,
	ahora: Date = new Date()
): Promise<{ clase: 'tal_dia' | 'frase' | 'chiste'; entrada: Entrada } | null> {
	const dia = diaLocal(ahora);
	const diaDelMes = Number(dia.slice(8, 10));
	const hash = hashDia(dia);

	const candidatos: { clase: 'tal_dia' | 'frase' | 'chiste'; entrada: Entrada }[] = [];

	const haceUnMes = new Date(ahora.getTime() - 28 * 24 * 60 * 60 * 1000);
	const talDia = await bd()
		.select()
		.from(tablas.entradas)
		.where(
			and(
				eq(tablas.entradas.userId, userId),
				isNull(tablas.entradas.borradoEn),
				lt(tablas.entradas.timestamp, haceUnMes),
				sql`extract(day from ${tablas.entradas.timestamp} at time zone 'Europe/Madrid') = ${diaDelMes}`,
				sql`${tablas.entradas.tipo} not in ('metrica', 'sin_clasificar', 'tarea')`
			)
		)
		.orderBy(desc(tablas.entradas.timestamp))
		.limit(10);
	if (talDia.length > 0) {
		candidatos.push({ clase: 'tal_dia', entrada: talDia[hash % talDia.length] });
	}

	for (const tipo of ['frase', 'chiste'] as const) {
		const filas = await bd()
			.select()
			.from(tablas.entradas)
			.where(
				and(
					eq(tablas.entradas.userId, userId),
					eq(tablas.entradas.tipo, tipo),
					isNull(tablas.entradas.borradoEn)
				)
			)
			.orderBy(desc(tablas.entradas.timestamp))
			.limit(50);
		if (filas.length > 0) {
			candidatos.push({ clase: tipo, entrada: filas[hash % filas.length] });
		}
	}

	if (candidatos.length === 0) return null;
	return candidatos[hash % candidatos.length];
}

export async function metricaDelDia(userId: string, dia: string): Promise<Entrada | null> {
	// El día local se guarda en contexto.dia al crearla; filtrar por él evita
	// líos de zona horaria al cambiar de día en UTC.
	const [fila] = await bd()
		.select()
		.from(tablas.entradas)
		.where(
			and(
				eq(tablas.entradas.userId, userId),
				eq(tablas.entradas.tipo, 'metrica'),
				isNull(tablas.entradas.borradoEn),
				sql`${tablas.entradas.contexto}->>'dia' = ${dia}`
			)
		)
		.limit(1);
	return fila ?? null;
}
