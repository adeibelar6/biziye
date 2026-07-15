import { env } from '$env/dynamic/private';
import { configIA } from '$lib/server/config';
import { proveedorMock } from './mock';
import { crearProveedorOpenAI } from './openai';
import type { ProveedorIA } from './tipos';

export type { ProveedorIA } from './tipos';

/** Qué proveedor hay configurado en .env (independiente del interruptor). */
export function proveedorConfigurado(): { nombre: string; listo: boolean; detalle: string } {
	const eleccion = (env.IA_PROVEEDOR || 'mock').toLowerCase();
	switch (eleccion) {
		case 'openai':
			return env.OPENAI_API_KEY
				? { nombre: 'openai', listo: true, detalle: `API oficial de OpenAI (${env.OPENAI_MODELO || 'gpt-4o-mini'})` }
				: { nombre: 'openai', listo: false, detalle: 'Falta OPENAI_API_KEY en .env' };
		case 'bridge':
			return env.BRIDGE_URL
				? { nombre: 'bridge', listo: true, detalle: `Puente por suscripción (${env.BRIDGE_URL})` }
				: { nombre: 'bridge', listo: false, detalle: 'Falta BRIDGE_URL en .env (ver docs/bridge.md)' };
		default:
			return { nombre: 'mock', listo: true, detalle: 'Heurísticas locales, sin claves ni red' };
	}
}

function construirProveedor(): ProveedorIA {
	const configurado = proveedorConfigurado();
	if (!configurado.listo) return proveedorMock;

	switch (configurado.nombre) {
		case 'openai':
			return crearProveedorOpenAI({
				nombre: 'openai',
				baseUrl: 'https://api.openai.com/v1',
				apiKey: env.OPENAI_API_KEY!,
				modelo: env.OPENAI_MODELO || 'gpt-4o-mini'
			});
		case 'bridge':
			// El puente expone una API compatible con OpenAI (ver docs/bridge.md):
			// mismo protocolo, otra URL base y el token de la suscripción.
			return crearProveedorOpenAI({
				nombre: 'bridge',
				baseUrl: env.BRIDGE_URL!,
				apiKey: env.BRIDGE_TOKEN || 'sin-token',
				modelo: env.OPENAI_MODELO || 'gpt-5.2'
			});
		default:
			return proveedorMock;
	}
}

/**
 * Proveedor activo para un usuario, o null si la IA está apagada en Ajustes.
 * Cualquier código que quiera hablar con la IA pasa por aquí.
 */
export async function proveedorIA(userId: string): Promise<ProveedorIA | null> {
	const config = await configIA(userId);
	if (!config.activa) return null;
	return construirProveedor();
}
