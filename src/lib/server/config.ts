import { eq, and } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';

/** Configuración clave/valor por usuario (jsonb). */

export async function leerConfig<T>(userId: string, clave: string, porDefecto: T): Promise<T> {
	const [fila] = await bd()
		.select({ valor: tablas.config.valor })
		.from(tablas.config)
		.where(and(eq(tablas.config.userId, userId), eq(tablas.config.clave, clave)))
		.limit(1);
	return fila ? (fila.valor as T) : porDefecto;
}

export async function guardarConfig(userId: string, clave: string, valor: unknown): Promise<void> {
	await bd()
		.insert(tablas.config)
		.values({ userId, clave, valor, actualizadoEn: new Date() })
		.onConflictDoUpdate({
			target: [tablas.config.userId, tablas.config.clave],
			set: { valor, actualizadoEn: new Date() }
		});
}

/** Config de la capa de IA (Ajustes → Inteligencia artificial). */
export type ConfigIA = {
	activa: boolean;
	/** Tipos de entrada que la IA no debe ver jamás (interruptor por apartado). */
	tiposOcultos: string[];
};

export const CONFIG_IA_POR_DEFECTO: ConfigIA = { activa: true, tiposOcultos: [] };

export function configIA(userId: string): Promise<ConfigIA> {
	return leerConfig<ConfigIA>(userId, 'ia', CONFIG_IA_POR_DEFECTO);
}
