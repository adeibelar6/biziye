import { json } from '@sveltejs/kit';
import { crearEntrada } from '$lib/server/entradas';
import { TIPOS } from '$lib/tipos';
import { payloadDesdeTexto } from '$lib/tipos/desde-texto';
import type { RequestHandler } from './$types';

/**
 * Captura universal: texto libre (+ tipo opcional elegido a mano).
 * - Con tipo: se crea directamente.
 * - Sin tipo: se intenta clasificar con la IA; si está apagada o duda,
 *   cae al inbox como sin_clasificar.
 * idCliente (uuid) hace la llamada idempotente para la cola offline.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const usuario = locals.usuario!;
	const cuerpo = await request.json().catch(() => null);
	const texto = typeof cuerpo?.texto === 'string' ? cuerpo.texto.trim() : '';
	if (!texto) {
		return json({ error: 'No hay nada que capturar.' }, { status: 400 });
	}

	const timestamp =
		typeof cuerpo.timestamp === 'string' && !Number.isNaN(Date.parse(cuerpo.timestamp))
			? new Date(cuerpo.timestamp)
			: new Date();
	const idCliente = typeof cuerpo.idCliente === 'string' ? cuerpo.idCliente : undefined;
	const tipoManual = typeof cuerpo.tipo === 'string' && TIPOS.has(cuerpo.tipo) ? cuerpo.tipo : null;

	if (tipoManual) {
		const payload = payloadDesdeTexto(tipoManual, texto);
		if (payload) {
			const entrada = await crearEntrada(usuario.id, {
				id: idCliente,
				tipo: tipoManual,
				payload,
				timestamp
			});
			return json({ entrada, destino: 'directa' }, { status: 201 });
		}
		// Tipo elegido pero el texto no da para rellenarlo: al inbox con pista.
		const entrada = await crearEntrada(usuario.id, {
			id: idCliente,
			tipo: 'sin_clasificar',
			payload: { texto },
			tags: [`quería:${tipoManual}`],
			timestamp
		});
		return json({ entrada, destino: 'inbox' }, { status: 201 });
	}

	const entrada = await crearEntrada(usuario.id, {
		id: idCliente,
		tipo: 'sin_clasificar',
		payload: { texto },
		timestamp
	});
	return json({ entrada, destino: 'inbox' }, { status: 201 });
};
