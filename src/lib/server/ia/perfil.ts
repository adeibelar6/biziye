import { and, desc, eq } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';
import { entradasParaIA } from './datos';
import { proveedorIA } from './index';
import { diaLocal } from '$lib/fechas';

/**
 * Perfil vivo: el documento markdown que la IA mantiene sobre el usuario.
 * Cada actualización (de la IA o manual) es una versión nueva — nunca se
 * pisa nada. Los datos que ve la IA salen de entradasParaIA, como siempre.
 */

export type VersionPerfil = typeof tablas.perfilVivo.$inferSelect;

const PERFIL_INICIAL = `# Perfil vivo

Documento que la IA mantiene sobre ti a partir de lo que registras.
Todavía está en blanco: se irá escribiendo con tus cierres, fallos,
logros y métricas. También puedes editarlo a mano en este apartado.`;

export async function perfilActual(userId: string): Promise<VersionPerfil | null> {
	const [fila] = await bd()
		.select()
		.from(tablas.perfilVivo)
		.where(eq(tablas.perfilVivo.userId, userId))
		.orderBy(desc(tablas.perfilVivo.version))
		.limit(1);
	return fila ?? null;
}

export async function historialPerfil(userId: string, limite = 20): Promise<VersionPerfil[]> {
	return bd()
		.select()
		.from(tablas.perfilVivo)
		.where(eq(tablas.perfilVivo.userId, userId))
		.orderBy(desc(tablas.perfilVivo.version))
		.limit(limite);
}

export async function versionPerfil(
	userId: string,
	version: number
): Promise<VersionPerfil | null> {
	const [fila] = await bd()
		.select()
		.from(tablas.perfilVivo)
		.where(and(eq(tablas.perfilVivo.userId, userId), eq(tablas.perfilVivo.version, version)))
		.limit(1);
	return fila ?? null;
}

async function guardarVersion(
	userId: string,
	contenido: string,
	motivo: string
): Promise<VersionPerfil> {
	const actual = await perfilActual(userId);
	const [fila] = await bd()
		.insert(tablas.perfilVivo)
		.values({ userId, version: (actual?.version ?? 0) + 1, contenido, motivo })
		.returning();
	return fila;
}

/** Edición manual: una versión nueva con lo que escribió el usuario. */
export async function editarPerfil(userId: string, contenido: string): Promise<VersionPerfil> {
	return guardarVersion(userId, contenido.trim() || PERFIL_INICIAL, 'edicion_manual');
}

/**
 * Actualización por la IA: toma el perfil actual y lo que se registró desde
 * la última versión, y guarda el documento revisado como versión nueva.
 * Devuelve null si la IA está apagada o no había nada nuevo que mirar.
 */
export async function actualizarPerfilConIA(
	userId: string,
	motivo = 'analisis'
): Promise<VersionPerfil | null> {
	const proveedor = await proveedorIA(userId);
	if (!proveedor) return null;

	const actual = await perfilActual(userId);
	const desde = actual?.creadoEn;
	const entradas = await entradasParaIA(userId, { desde, limite: 100 });
	if (actual && entradas.length === 0) return null;

	const metricas = entradas.filter((e) => e.tipo === 'metrica');
	const datos = {
		fecha: diaLocal(),
		perfilActual: actual?.contenido ?? PERFIL_INICIAL,
		fallosNuevos: entradas
			.filter((e) => e.tipo === 'fallo')
			.map((e) => String(e.payload.texto ?? '')),
		logrosNuevos: entradas
			.filter((e) => e.tipo === 'logro')
			.map((e) => String(e.payload.texto ?? '')),
		mediaAnimo:
			metricas.length > 0
				? metricas.reduce((suma, m) => suma + (Number(m.payload.animo) || 0), 0) /
					Math.max(
						1,
						metricas.filter((m) => Number(m.payload.animo) > 0).length
					)
				: undefined
	};

	const contenido = await proveedor.generar('perfil', JSON.stringify(datos));
	if (!contenido.trim()) return null;
	return guardarVersion(userId, contenido, motivo);
}

export { PERFIL_INICIAL };
