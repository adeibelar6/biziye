import { desc, eq, isNull, and } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';
import { enviarPushAlUsuario } from '$lib/server/push';
import { leerConfig, guardarConfig } from '$lib/server/config';
import { diaLocal, diasEntre, horaLocal } from '$lib/fechas';
import type { Evaluador } from './cron';

/**
 * Anti-abandono (decidido así en biziye.md, con tono borde y humor negro):
 * a los 14 días sin registrar nada, aviso de reenganche. Como mucho uno
 * por semana, y solo en horas humanas.
 */

const DIAS_SILENCIO = 14;
const DIAS_ENTRE_AVISOS = 7;

export const VARIANTES_REENGANCHE: { titulo: string; cuerpo: string }[] = [
	{
		titulo: 'Dos semanas de silencio.',
		cuerpo: 'Eres una mierda, vuelve. Tu vida sigue pasando aunque no la apuntes.'
	},
	{
		titulo: '¿Sigues vivo?',
		cuerpo: 'Porque tu diario no lo sabe. 14 días en blanco, campeón. Apunta algo, lo que sea.'
	},
	{
		titulo: 'Tu biógrafo ha muerto de hambre.',
		cuerpo: 'Dos semanas sin una mísera nota. Ni tu vida es tan aburrida. Vuelve.'
	},
	{
		titulo: 'BIZIYE te echa de menos. Es lo único que te echa de menos.',
		cuerpo: 'Humor negro aparte: 30 segundos, una entrada, y volvemos a hablar.'
	},
	{
		titulo: 'Esto sin ti no funciona, genio.',
		cuerpo: 'La IA no puede aprender de un páramo. Escribe algo antes de que te olvide.'
	}
];

function hashDia(semilla: string): number {
	let hash = 0;
	for (let i = 0; i < semilla.length; i++) hash = (hash * 31 + semilla.charCodeAt(i)) >>> 0;
	return hash;
}

type EstadoReenganche = { ultimoAviso: string | null };

export async function evaluarReenganche(ahora: Date = new Date()): Promise<void> {
	// Horas humanas: nadie necesita ser insultado a las 4 de la mañana.
	const hora = horaLocal(ahora);
	if (hora < 10 || hora >= 21) return;

	const usuarios = await bd().select({ id: tablas.usuarios.id }).from(tablas.usuarios);
	for (const usuario of usuarios) {
		const [ultima] = await bd()
			.select({ timestamp: tablas.entradas.timestamp })
			.from(tablas.entradas)
			.where(and(eq(tablas.entradas.userId, usuario.id), isNull(tablas.entradas.borradoEn)))
			.orderBy(desc(tablas.entradas.timestamp))
			.limit(1);
		// Sin entradas todavía no hay abandono: hay estreno pendiente.
		if (!ultima) continue;
		if (diasEntre(ultima.timestamp, ahora) < DIAS_SILENCIO) continue;

		const estado = await leerConfig<EstadoReenganche>(usuario.id, 'reenganche', {
			ultimoAviso: null
		});
		if (estado.ultimoAviso && diasEntre(new Date(estado.ultimoAviso), ahora) < DIAS_ENTRE_AVISOS) {
			continue;
		}

		const variante =
			VARIANTES_REENGANCHE[hashDia(diaLocal(ahora)) % VARIANTES_REENGANCHE.length];
		await enviarPushAlUsuario(usuario.id, {
			...variante,
			url: '/capturar',
			etiqueta: 'reenganche'
		});
		await guardarConfig(usuario.id, 'reenganche', {
			ultimoAviso: ahora.toISOString()
		} satisfies EstadoReenganche);
	}
}

export const evaluadorReenganche: Evaluador = {
	nombre: 'reenganche',
	async ejecutar() {
		await evaluarReenganche();
	}
};
