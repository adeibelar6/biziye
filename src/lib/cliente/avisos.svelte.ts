/** Avisos flotantes (toasts) — estado global con runas. */

export type Aviso = {
	id: number;
	texto: string;
	tono: 'ok' | 'error' | 'info';
};

let siguienteId = 1;

export const avisos = $state<Aviso[]>([]);

export function avisar(texto: string, tono: Aviso['tono'] = 'ok', duracionMs = 3000) {
	const id = siguienteId++;
	avisos.push({ id, texto, tono });
	setTimeout(() => {
		const indice = avisos.findIndex((a) => a.id === id);
		if (indice !== -1) avisos.splice(indice, 1);
	}, duracionMs);
}
