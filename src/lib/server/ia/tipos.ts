import type { Payload } from '$lib/tipos';

/**
 * Contratos del adaptador de IA. La app solo habla con la interfaz
 * ProveedorIA; qué hay detrás (mock, OpenAI, puente) lo decide .env.
 */

export type MensajeIA = { rol: 'usuario' | 'ia' | 'sistema'; contenido: string };

/**
 * Herramienta que el proveedor puede usar durante el chat para consultar la
 * BD. Los ejecutores viven en el servidor y SIEMPRE leen a través de la capa
 * de datos filtrada por privacidad (src/lib/server/ia/datos.ts).
 */
export type HerramientaIA = {
	nombre: string;
	descripcion: string;
	/** JSON Schema de los argumentos. */
	parametros: Record<string, unknown>;
	ejecutar: (argumentos: Record<string, unknown>) => Promise<string>;
};

export type ResultadoChat = {
	texto: string;
	herramientasUsadas: string[];
};

export type Clasificacion = {
	tipo: string;
	payload: Payload;
	tags: string[];
	/** 0..1 — por debajo del umbral, la captura cae al inbox. */
	confianza: number;
};

export type PropositoGeneracion =
	| 'cierre_dia'
	| 'briefing'
	| 'informe_mensual'
	| 'revision_semanal'
	| 'perfil';

export interface ProveedorIA {
	nombre: string;
	/** Texto libre → entrada tipada, o null si no se atreve. */
	clasificar(texto: string): Promise<Clasificacion | null>;
	/** Conversación con acceso a herramientas de consulta. */
	chat(mensajes: MensajeIA[], herramientas: HerramientaIA[]): Promise<ResultadoChat>;
	/** Textos generados (cierre del día, briefing, informe, revisión, perfil). */
	generar(proposito: PropositoGeneracion, datos: string): Promise<string>;
}
