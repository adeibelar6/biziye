import { json } from '@sveltejs/kit';
import { turnoDeChat } from '$lib/server/ia/chat';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const cuerpo = await request.json().catch(() => null);
	const texto = typeof cuerpo?.texto === 'string' ? cuerpo.texto.trim() : '';
	if (!texto) return json({ error: 'Mensaje vacío' }, { status: 400 });

	const conversacionId =
		typeof cuerpo.conversacionId === 'string' ? cuerpo.conversacionId : undefined;

	const resultado = await turnoDeChat(locals.usuario!.id, texto, conversacionId);

	if (!resultado.ok) {
		return json({ error: resultado.error }, { status: resultado.error === 'ia_apagada' ? 409 : 502 });
	}

	return json(resultado);
};
