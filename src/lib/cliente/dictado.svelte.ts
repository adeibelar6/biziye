/**
 * Dictado por voz con la Web Speech API (v1 de biziye.md: micro → texto).
 * Chrome/Edge/Android lo traen de serie; si el navegador no lo soporta,
 * `disponible` es false y la UI esconde el micro.
 */

type ReconocimientoVoz = {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((evento: EventoResultadoVoz) => void) | null;
	onend: (() => void) | null;
	onerror: ((evento: { error: string }) => void) | null;
};

type EventoResultadoVoz = {
	resultIndex: number;
	results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type ConstructorVoz = new () => ReconocimientoVoz;

function constructorVoz(): ConstructorVoz | null {
	if (typeof window === 'undefined') return null;
	const w = window as unknown as {
		SpeechRecognition?: ConstructorVoz;
		webkitSpeechRecognition?: ConstructorVoz;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function crearDictado(alTexto: (textoFinal: string, provisional: string) => void) {
	const Reconocimiento = constructorVoz();

	const estado = $state({
		disponible: Reconocimiento !== null,
		escuchando: false,
		error: ''
	});

	let reconocimiento: ReconocimientoVoz | null = null;

	function empezar() {
		if (!Reconocimiento || estado.escuchando) return;
		estado.error = '';
		reconocimiento = new Reconocimiento();
		reconocimiento.lang = 'es-ES';
		reconocimiento.continuous = true;
		reconocimiento.interimResults = true;

		reconocimiento.onresult = (evento) => {
			let final = '';
			let provisional = '';
			for (let i = evento.resultIndex; i < evento.results.length; i++) {
				const resultado = evento.results[i];
				if (resultado.isFinal) final += resultado[0].transcript;
				else provisional += resultado[0].transcript;
			}
			alTexto(final, provisional);
		};

		reconocimiento.onerror = (evento) => {
			estado.error =
				evento.error === 'not-allowed'
					? 'Sin permiso para usar el micrófono.'
					: evento.error === 'no-speech'
						? ''
						: 'El dictado falló, prueba otra vez.';
			estado.escuchando = false;
		};

		reconocimiento.onend = () => {
			estado.escuchando = false;
		};

		reconocimiento.start();
		estado.escuchando = true;
	}

	function parar() {
		reconocimiento?.stop();
		estado.escuchando = false;
	}

	return {
		estado,
		empezar,
		parar,
		alternar: () => (estado.escuchando ? parar() : empezar())
	};
}
