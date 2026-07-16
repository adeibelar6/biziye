import type {
	Clasificacion,
	HerramientaIA,
	MensajeIA,
	PropositoGeneracion,
	ProveedorIA,
	ResultadoChat
} from './tipos';
import {
	categoriaGasto,
	extraerEvento,
	extraerImporte,
	payloadDesdeTexto
} from '$lib/tipos/desde-texto';

/**
 * Proveedor mock: heurísticas deterministas, sin red y sin claves.
 * Permite desarrollar y usar TODA la app (clasificar, chat, cierres,
 * informes) antes de conectar un proveedor real.
 */

// ── Clasificación por palabras clave ─────────────────────────────────────────

type Regla = {
	tipo: string;
	confianza: number;
	patron: RegExp;
	construir?: (texto: string) => Record<string, unknown> | null;
};

const REGLAS: Regla[] = [
	{
		tipo: 'primera_vez',
		confianza: 0.9,
		patron: /primera vez/i
	},
	{
		tipo: 'chiste',
		confianza: 0.85,
		patron: /\bchiste\b|\bjajaj|¿(qué|que) le dice\b/i,
		construir: (t) => ({ texto: t.replace(/^apunta(r)? (este |un )?chiste:?\s*/i, '').trim() })
	},
	{
		tipo: 'frase',
		confianza: 0.8,
		// «cita de» (una cita de alguien); la cita-agenda es del tipo evento.
		patron: /^[«"“'].+[»"”']|frase de|me dijo:|\bcita de\b/i,
		construir: (t) => {
			const conAutor = t.match(/[«"“](.+)[»"”]\s*[—-]?\s*(.+)?/);
			if (conAutor) {
				return { texto: conAutor[1].trim(), autor: conAutor[2]?.trim() || undefined };
			}
			return { texto: t };
		}
	},
	{
		tipo: 'pelicula',
		confianza: 0.8,
		patron: /\b(pel[ií]cula|peli|serie|temporada)\b|me\s+(ha\s+)?recomend[\wáéíóúñ]+/i,
		construir: (texto) => {
			// Recomendaciones que claramente no son de cine: que decida otra regla.
			if (/\b(restaurante|libro|disco|sitio|bar|hotel|receta)\b/i.test(texto)) return null;
			// «Ana me recomendó Dune» / «apunta la peli Dune que me recomendó Ana»
			const recomendacion = texto.match(
				/(?:^|\s)([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)\s+me\s+(?:ha\s+)?recomend[\wáéíóúñ]+\s+(.+)/i
			);
			if (recomendacion) {
				const titulo = recomendacion[2]
					.replace(/\b(la|el)\s+(peli|película|serie)\s+/i, '')
					.replace(/[.?!]+$/, '')
					.trim();
				return {
					titulo,
					recomendador: recomendacion[1],
					estado: 'pendiente',
					formato: /serie|temporada/i.test(texto) ? 'serie' : 'pelicula'
				};
			}
			const titulo = texto
				.replace(/^(apunta(r)?|añade|guarda)\s+/i, '')
				.replace(/\b(la|una?|el)\s+(pel[ií]cula|peli|serie)\b/gi, '')
				.replace(/\b(para ver|pendiente|que me recomendaron)\b/gi, '')
				.replace(/\s{2,}/g, ' ')
				.replace(/[.?!]+$/, '')
				.trim();
			if (!titulo) return null;
			return {
				titulo,
				estado: 'pendiente',
				formato: /serie|temporada/i.test(texto) ? 'serie' : 'pelicula'
			};
		}
	},
	{
		tipo: 'gasto',
		confianza: 0.85,
		patron: /(\d+([.,]\d{1,2})?)\s*(€|euros?|eur\b|pavos)|he pagado|he gastado|me ha costado/i,
		construir: (texto) => {
			const importe = extraerImporte(texto);
			if (importe === undefined) return null;
			const descripcion = texto
				.replace(/(he\s+)?(pagado|gastado|costado|compré|comprado)\s*/gi, '')
				.replace(/(\d+([.,]\d{1,2})?)\s*(€|euros?|eur\b|pavos)?/i, '')
				.replace(/^\s*(de|en|el|la|los|las|por)\s+/i, '')
				.replace(/\s{2,}/g, ' ')
				.trim();
			return { importe, categoria: categoriaGasto(texto), descripcion };
		}
	},
	{
		tipo: 'fallo',
		confianza: 0.8,
		patron:
			/la he liado|lo he liado|fall[eé]|me equivoqu[eé]|error m[ií]o|met[ií] la pata|discut[ií]|perd[ií] los nervios|me sali[oó] mal|cagada|no deber[ií]a haber/i
	},
	{
		tipo: 'logro',
		confianza: 0.8,
		patron:
			/consegu[ií]|logr[eé]|me ha salido (bien|genial)|por fin (he|pude|termin)|orgullos[oa]|lo bord[eé]|sal[ií]o redondo/i
	},
	{
		tipo: 'evento',
		confianza: 0.85,
		// Después de fallo/logro: «la he liado en la reunión» no es agenda.
		// «reu[ni]+[oó]n» perdona el baile de letras al teclear («reuinion»).
		patron:
			/\b(reu[ni]+[oó]n|cita|quedada|entrevista|m[eé]dic[oa]|dentista|fisio|evento)\b|he quedado|quedo con/i,
		construir: (texto) => extraerEvento(texto)
	},
	{
		tipo: 'deseo',
		confianza: 0.75,
		patron: /quiero comprar(me)?|me pido|me encantar[ií]a tener|ojal[aá] pudiera comprar|antojo de/i,
		construir: (texto) => {
			const nombre = texto
				.replace(/.*?(quiero comprar(me)?|me pido|me encantar[ií]a tener|antojo de)\s*/i, '')
				.replace(/[.?!]+$/, '')
				.trim();
			if (!nombre) return null;
			const precio = extraerImporte(nombre);
			return { nombre: nombre.replace(/(\d+([.,]\d{1,2})?)\s*(€|euros?)?/, '').trim() || nombre, precio, estado: 'enfriando' };
		}
	},
	{
		tipo: 'tarea',
		confianza: 0.75,
		patron:
			/^(comprar|llamar|enviar|mandar|pedir|recoger|llevar|renovar|pagar|reservar|revisar|arreglar|devolver|imprimir|apuntarme)\b|tengo que |hay que |acordarme de |no olvidar/i,
		construir: (texto) => ({
			texto: texto.replace(/^(tengo que|hay que|acordarme de|no olvidar(me de)?)\s+/i, '').trim(),
			hecha: false
		})
	}
];

function clasificarMock(texto: string): Clasificacion | null {
	for (const regla of REGLAS) {
		if (!regla.patron.test(texto)) continue;
		const payload = regla.construir
			? regla.construir(texto)
			: (payloadDesdeTexto(regla.tipo, texto) ?? { texto });
		if (!payload) continue;
		return { tipo: regla.tipo, payload, tags: [], confianza: regla.confianza };
	}
	return null;
}

// ── Chat por intenciones ─────────────────────────────────────────────────────

function herramienta(herramientas: HerramientaIA[], nombre: string): HerramientaIA | undefined {
	return herramientas.find((h) => h.nombre === nombre);
}

function rangoDelTexto(texto: string): { desde?: string; hasta?: string } {
	const ahora = new Date();
	// Día local (no UTC): a las 00:30 de Madrid, toISOString() ya es «ayer».
	const dia = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	if (/hoy/i.test(texto)) return { desde: dia(ahora) };
	if (/esta semana/i.test(texto)) {
		const lunes = new Date(ahora);
		const diaSemana = (ahora.getDay() + 6) % 7;
		lunes.setDate(ahora.getDate() - diaSemana);
		return { desde: dia(lunes) };
	}
	if (/este a[ñn]o/i.test(texto)) {
		return { desde: `${ahora.getFullYear()}-01-01` };
	}
	// Por defecto: este mes.
	return { desde: dia(new Date(ahora.getFullYear(), ahora.getMonth(), 1)) };
}

async function chatMock(
	mensajes: MensajeIA[],
	herramientas: HerramientaIA[]
): Promise<ResultadoChat> {
	const ultimo = [...mensajes].reverse().find((m) => m.rol === 'usuario');
	const texto = ultimo?.contenido.trim() ?? '';
	const t = texto.toLowerCase();
	const usadas: string[] = [];

	async function usar(nombre: string, argumentos: Record<string, unknown>): Promise<string> {
		const h = herramienta(herramientas, nombre);
		if (!h) return 'No tengo esa consulta disponible.';
		usadas.push(nombre);
		return h.ejecutar(argumentos);
	}

	// 1. Capturar conversando: «apunta que…»
	const captura = texto.match(
		/^ *(?:apunta(?:me)?|anota|registra|guarda|añade)(?:\s+que)?\s+(.+)/i
	);
	if (captura) {
		const resultado = await usar('crear_entrada', { texto: captura[1] });
		return { texto: resultado, herramientasUsadas: usadas };
	}

	// 2. Gastos: «¿cuánto he gastado este mes?»
	if (/(cu[aá]nto).*(gastado|gasto)|gastos\b|en qu[eé] se me va el dinero/i.test(t)) {
		const resultado = await usar('resumen_gastos', rangoDelTexto(t));
		return { texto: resultado, herramientasUsadas: usadas };
	}

	// 3. Cine: recomendaciones de alguien concreto.
	const porRecomendador = texto.match(
		/recomend[\wáéíóúñ]+\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)\s*\??\s*$/i
	);
	if (porRecomendador && /(pel[ií]|serie|cine|ver)/i.test(t)) {
		const resultado = await usar('cine', {
			modo: 'pendientes',
			recomendador: porRecomendador[1]
		});
		return { texto: resultado, herramientasUsadas: usadas };
	}

	// 4. «¿Qué veo esta noche?»
	if (/(qu[eé]\s+(veo|ver|me pongo))|esta noche/i.test(t) && /noche|veo|ver|pel[ií]|serie/i.test(t)) {
		const resultado = await usar('cine', { modo: 'recomendacion' });
		return { texto: resultado, herramientasUsadas: usadas };
	}

	// 5. Estadísticas o ranking de cine.
	if (/(cine|pel[ií]s|pel[ií]culas|series).*(estad[ií]st|ranking|top|cu[aá]nt|mejores)/i.test(t)) {
		const resultado = await usar('cine', { modo: 'estadisticas' });
		return { texto: resultado, herramientasUsadas: usadas };
	}

	// 6. Tareas.
	if (/\btareas?\b|\bpendientes\b/i.test(t)) {
		const resultado = await usar('tareas_pendientes', {});
		return { texto: resultado, herramientasUsadas: usadas };
	}

	// 7. Búsqueda: «¿cuándo fue la última vez que…?» o palabras sueltas.
	const busqueda = texto
		.replace(/[¿?¡!.,]/g, ' ')
		.replace(
			/\b(cu[aá]ndo|fue|la|el|los|las|de|que|qu[eé]|una?|última|ultima|vez|hay|sobre|mis?|me|busca(r)?|ense[ñn]a(me)?)\b/gi,
			' '
		)
		.replace(/\s{2,}/g, ' ')
		.trim();
	if (busqueda.length >= 3) {
		const resultado = await usar('buscar_entradas', { q: busqueda, limite: 8 });
		return {
			texto: resultado,
			herramientasUsadas: usadas
		};
	}

	return {
		texto:
			'Puedo hacer dos cosas: capturar («apunta que he pagado 12 € del gimnasio») y consultar ' +
			'(«¿cuánto he gastado este mes?», «¿qué me recomendó Ana?», «¿qué veo esta noche?», ' +
			'«¿cuándo fue la última vez que fui al dentista?»). Dispara.',
		herramientasUsadas: usadas
	};
}

// ── Generación de textos ─────────────────────────────────────────────────────

function leerDatos<T>(datos: string): T | null {
	try {
		return JSON.parse(datos) as T;
	} catch {
		return null;
	}
}

type DatosCierre = {
	fallos?: string[];
	logros?: string[];
	gastoTotal?: number;
	animo?: number;
	totalEntradas?: number;
	tareasHechas?: number;
};

function generarCierre(datos: string): string {
	const d = leerDatos<DatosCierre>(datos) ?? {};
	const preguntas: string[] = [];

	if (d.fallos && d.fallos.length > 0) {
		preguntas.push(
			`Hoy has apuntado este fallo: «${d.fallos[0]}». ¿Qué lo disparó de verdad, y qué señal temprana podrías detectar la próxima vez?`
		);
	}
	if (d.logros && d.logros.length > 0) {
		preguntas.push(
			`Sobre «${d.logros[0]}»: ¿qué condiciones lo hicieron posible y cómo puedes repetirlas mañana?`
		);
	}
	if (typeof d.animo === 'number' && d.animo <= 2) {
		preguntas.push(
			`El ánimo ha estado en ${d.animo}/5. ¿Qué ha pesado más, y qué única cosa lo subiría un punto mañana?`
		);
	}
	if (preguntas.length === 0) {
		preguntas.push(
			d.totalEntradas && d.totalEntradas > 0
				? '¿Qué es lo más importante que ha pasado hoy y qué aprendes de ello?'
				: 'Hoy no has apuntado nada. ¿Qué es lo único que no debería perderse antes de dormir?'
		);
	}
	preguntas.push('¿Qué harás distinto mañana? Una sola cosa, concreta.');

	return preguntas.slice(0, 3).join('\n');
}

type DatosBriefing = {
	tareasPendientes?: string[];
	avisos?: { titulo: string; cuando: string }[];
	animoAyer?: number;
	suenoAyer?: number;
	diasSinRegistrar?: number;
};

function generarBriefing(datos: string): string {
	const d = leerDatos<DatosBriefing>(datos) ?? {};
	const partes: string[] = [];

	if (d.avisos && d.avisos.length > 0) {
		partes.push(
			'Avisos a la vista: ' + d.avisos.map((a) => `${a.titulo} (${a.cuando})`).join(' · ') + '.'
		);
	}
	if (d.tareasPendientes && d.tareasPendientes.length > 0) {
		const primeras = d.tareasPendientes.slice(0, 3).join('», «');
		partes.push(
			`Tienes ${d.tareasPendientes.length} ${d.tareasPendientes.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}: «${primeras}»${d.tareasPendientes.length > 3 ? '…' : ''}.`
		);
	}
	if (typeof d.suenoAyer === 'number' && d.suenoAyer <= 2) {
		partes.push(
			`Ayer dormiste ${d.suenoAyer}/5: histórico en mano, los días así te cuestan más. Hoy, con calma y sin decisiones grandes.`
		);
	} else if (typeof d.animoAyer === 'number' && d.animoAyer >= 4) {
		partes.push(`Ayer acabaste con el ánimo en ${d.animoAyer}/5. Aprovecha la inercia.`);
	}
	if (partes.length === 0) {
		partes.push('Día despejado: ni tareas urgentes ni avisos. Elige tú por dónde empezar.');
	}
	return partes.join('\n');
}

type DatosInforme = {
	mes?: string;
	totalEntradas?: number;
	porTipo?: Record<string, number>;
	gastoTotal?: number;
	porCategoria?: Record<string, number>;
	medias?: { animo?: number; energia?: number; sueno?: number };
	fallos?: string[];
	logros?: string[];
	pelisVistas?: number;
	mejorPeli?: string;
	primerasVeces?: string[];
};

function generarInforme(datos: string): string {
	const d = leerDatos<DatosInforme>(datos) ?? {};
	const lineas: string[] = [`# Informe de ${d.mes ?? 'este mes'}`, ''];

	lineas.push(
		`Has registrado **${d.totalEntradas ?? 0} entradas**.` +
			(d.porTipo
				? ' Reparto: ' +
					Object.entries(d.porTipo)
						.sort((a, b) => b[1] - a[1])
						.map(([tipo, n]) => `${tipo} (${n})`)
						.join(', ') +
					'.'
				: '')
	);

	if (d.medias && (d.medias.animo || d.medias.energia || d.medias.sueno)) {
		lineas.push('');
		lineas.push(
			`**Métricas medias:** ánimo ${d.medias.animo?.toFixed(1) ?? '—'}/5 · energía ${d.medias.energia?.toFixed(1) ?? '—'}/5 · sueño ${d.medias.sueno?.toFixed(1) ?? '—'}/5.`
		);
	}

	if (typeof d.gastoTotal === 'number') {
		lineas.push('');
		let gasto = `**Dinero:** ${d.gastoTotal.toFixed(2)} € gastados`;
		if (d.porCategoria && Object.keys(d.porCategoria).length > 0) {
			const top = Object.entries(d.porCategoria).sort((a, b) => b[1] - a[1])[0];
			gasto += `, la categoría que más pesa es ${top[0]} (${top[1].toFixed(2)} €)`;
		}
		lineas.push(gasto + '.');
	}

	if (d.fallos && d.fallos.length > 0) {
		lineas.push('');
		lineas.push(`**Fallos (${d.fallos.length}):**`);
		for (const fallo of d.fallos.slice(0, 5)) lineas.push(`- ${fallo}`);
	}
	if (d.logros && d.logros.length > 0) {
		lineas.push('');
		lineas.push(`**Logros (${d.logros.length}):**`);
		for (const logro of d.logros.slice(0, 5)) lineas.push(`- ${logro}`);
	}
	if (d.fallos && d.logros && d.fallos.length > 0 && d.logros.length > 0) {
		lineas.push('');
		const balance =
			d.logros.length >= d.fallos.length
				? 'El balance del mes se inclina hacia los logros: apunta qué condiciones se repiten en ellos.'
				: 'Este mes pesan más los fallos que los logros. Mira los disparadores que se repiten: ahí hay patrón.';
		lineas.push(`**Lectura:** ${balance}`);
	}
	if (typeof d.pelisVistas === 'number' && d.pelisVistas > 0) {
		lineas.push('');
		lineas.push(
			`**Cine:** ${d.pelisVistas} ${d.pelisVistas === 1 ? 'título visto' : 'títulos vistos'}${d.mejorPeli ? `, el mejor: ${d.mejorPeli}` : ''}.`
		);
	}
	if (d.primerasVeces && d.primerasVeces.length > 0) {
		lineas.push('');
		lineas.push(`**Primeras veces:** ${d.primerasVeces.join(' · ')} — la novedad suma vida.`);
	}

	return lineas.join('\n');
}

type DatosRevision = {
	semana?: string;
	fallos?: string[];
	logros?: string[];
	gastoTotal?: number;
	tareasHechas?: number;
	medias?: { animo?: number; energia?: number; sueno?: number };
};

function generarRevision(datos: string): string {
	const d = leerDatos<DatosRevision>(datos) ?? {};
	const resumen: string[] = [`## Resumen de la semana ${d.semana ?? ''}`.trim(), ''];
	resumen.push(
		`Fallos: ${d.fallos?.length ?? 0} · Logros: ${d.logros?.length ?? 0} · Tareas hechas: ${d.tareasHechas ?? 0}` +
			(typeof d.gastoTotal === 'number' ? ` · Gasto: ${d.gastoTotal.toFixed(2)} €` : '')
	);
	if (d.medias?.animo) {
		resumen.push(`Ánimo medio ${d.medias.animo.toFixed(1)}/5, sueño medio ${d.medias.sueno?.toFixed(1) ?? '—'}/5.`);
	}
	resumen.push('');
	resumen.push('## Las preguntas del domingo');
	resumen.push('1. ¿Qué ha fallado esta semana, y qué lo disparó?');
	resumen.push('2. ¿Qué ha funcionado, y qué condiciones lo hicieron posible?');
	resumen.push('3. ¿Qué vas a repetir la semana que viene?');
	resumen.push('4. ¿Qué vas a dejar de hacer?');
	resumen.push('5. ¿Hay algo que llevas días posponiendo? ¿Qué es lo mínimo para desatascarlo?');
	return resumen.join('\n');
}

type DatosPerfil = {
	perfilActual?: string;
	fallosNuevos?: string[];
	logrosNuevos?: string[];
	mediaAnimo?: number;
	fecha?: string;
};

function generarPerfil(datos: string): string {
	const d = leerDatos<DatosPerfil>(datos) ?? {};
	const base =
		d.perfilActual && d.perfilActual.trim().length > 0
			? d.perfilActual.trim()
			: '# Perfil vivo\n\nDocumento que la IA mantiene sobre ti a partir de lo que registras.';

	const secciones: string[] = [base, '', `## Observaciones (${d.fecha ?? 'última tanda'})`];
	if (d.fallosNuevos && d.fallosNuevos.length > 0) {
		secciones.push(
			`- Fallos recientes (${d.fallosNuevos.length}): ${d.fallosNuevos.slice(0, 3).join(' · ')}`
		);
	}
	if (d.logrosNuevos && d.logrosNuevos.length > 0) {
		secciones.push(
			`- Logros recientes (${d.logrosNuevos.length}): ${d.logrosNuevos.slice(0, 3).join(' · ')}`
		);
	}
	if (typeof d.mediaAnimo === 'number') {
		secciones.push(`- Ánimo medio del periodo: ${d.mediaAnimo.toFixed(1)}/5`);
	}
	if (secciones.length === 3) {
		secciones.push('- Periodo tranquilo: sin fallos ni logros registrados.');
	}
	return secciones.join('\n');
}

export const proveedorMock: ProveedorIA = {
	nombre: 'mock',

	async clasificar(texto) {
		return clasificarMock(texto);
	},

	async chat(mensajes, herramientas) {
		return chatMock(mensajes, herramientas);
	},

	async generar(proposito: PropositoGeneracion, datos: string) {
		switch (proposito) {
			case 'cierre_dia':
				return generarCierre(datos);
			case 'briefing':
				return generarBriefing(datos);
			case 'informe_mensual':
				return generarInforme(datos);
			case 'revision_semanal':
				return generarRevision(datos);
			case 'perfil':
				return generarPerfil(datos);
		}
	}
};
