/**
 * Registro central de tipos de entrada (principio 4 de biziye.md: modelar
 * cualquier cosa). Añadir un tipo nuevo = añadir una definición aquí.
 * Sin migraciones: el payload es jsonb y la forma la describe este registro.
 *
 * Este módulo es compartido entre cliente y servidor: nada de imports de
 * servidor aquí.
 */

export type Control =
	| 'texto'
	| 'textarea'
	| 'numero'
	| 'moneda'
	| 'fecha'
	| 'escala5'
	| 'escala10'
	| 'opciones'
	| 'interruptor'
	| 'url';

export type Campo = {
	clave: string;
	etiqueta: string;
	control: Control;
	requerido?: boolean;
	placeholder?: string;
	ayuda?: string;
	opciones?: { valor: string; texto: string }[];
};

export type Tono = 'neutro' | 'verde' | 'amapola' | 'mostaza' | 'arcilla' | 'ciruela' | 'mar';

export type Payload = Record<string, unknown>;

export type DefinicionTipo = {
	tipo: string;
	nombre: string;
	plural: string;
	icono: string;
	tono: Tono;
	visibleIaPorDefecto: boolean;
	/** Frase corta para estados vacíos y el selector de tipo. */
	descripcion: string;
	/** Campo de texto principal donde cae lo capturado a mano. */
	campoPrincipal: string;
	campos: Campo[];
	/** Línea de resumen para timeline y listas. */
	resumen: (payload: Payload) => string;
};

function texto(payload: Payload, clave: string): string {
	const valor = payload[clave];
	return typeof valor === 'string' ? valor : '';
}

function numero(payload: Payload, clave: string): number | undefined {
	const valor = payload[clave];
	return typeof valor === 'number' && Number.isFinite(valor) ? valor : undefined;
}

export function formatearEuros(cantidad: number): string {
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cantidad);
}

const definiciones: DefinicionTipo[] = [
	{
		tipo: 'nota',
		nombre: 'Nota',
		plural: 'Notas',
		icono: 'nota',
		tono: 'neutro',
		visibleIaPorDefecto: true,
		descripcion: 'Cualquier cosa que quieras recordar.',
		campoPrincipal: 'texto',
		campos: [
			{
				clave: 'texto',
				etiqueta: 'Nota',
				control: 'textarea',
				requerido: true,
				placeholder: '¿Qué quieres apuntar?'
			}
		],
		resumen: (p) => texto(p, 'texto')
	},
	{
		tipo: 'sin_clasificar',
		nombre: 'Sin clasificar',
		plural: 'Sin clasificar',
		icono: 'inbox',
		tono: 'neutro',
		visibleIaPorDefecto: true,
		descripcion: 'Capturas pendientes de ordenar. Viven en el inbox.',
		campoPrincipal: 'texto',
		campos: [
			{ clave: 'texto', etiqueta: 'Texto', control: 'textarea', requerido: true }
		],
		resumen: (p) => texto(p, 'texto')
	},
	{
		tipo: 'fallo',
		nombre: 'Fallo',
		plural: 'Fallos',
		icono: 'rayo',
		tono: 'amapola',
		visibleIaPorDefecto: true,
		descripcion: 'Qué salió mal, qué lo disparó y en qué situación.',
		campoPrincipal: 'texto',
		campos: [
			{
				clave: 'texto',
				etiqueta: 'Qué pasó',
				control: 'textarea',
				requerido: true,
				placeholder: 'La he liado en…'
			},
			{
				clave: 'disparador',
				etiqueta: 'Qué lo disparó',
				control: 'texto',
				placeholder: 'Cansancio, una discusión, prisa…'
			},
			{
				clave: 'situacion',
				etiqueta: 'Situación',
				control: 'texto',
				placeholder: 'Dónde, con quién, haciendo qué'
			},
			{
				clave: 'en_su_lugar',
				etiqueta: 'Qué harías en su lugar',
				control: 'texto',
				placeholder: 'La próxima vez…'
			}
		],
		resumen: (p) => texto(p, 'texto')
	},
	{
		tipo: 'logro',
		nombre: 'Logro',
		plural: 'Logros',
		icono: 'trofeo',
		tono: 'mostaza',
		visibleIaPorDefecto: true,
		descripcion: 'Evidencias de lo que haces bien. Munición para días malos.',
		campoPrincipal: 'texto',
		campos: [
			{
				clave: 'texto',
				etiqueta: 'Qué salió bien',
				control: 'textarea',
				requerido: true
			},
			{
				clave: 'condiciones',
				etiqueta: 'Qué lo hizo posible',
				control: 'texto',
				placeholder: 'Dormí bien, lo preparé con tiempo…'
			}
		],
		resumen: (p) => texto(p, 'texto')
	},
	{
		tipo: 'tarea',
		nombre: 'Tarea',
		plural: 'Tareas',
		icono: 'check',
		tono: 'verde',
		visibleIaPorDefecto: true,
		descripcion: 'Cosas por hacer. Lista simple, sin proyectos.',
		campoPrincipal: 'texto',
		campos: [
			{
				clave: 'texto',
				etiqueta: 'Tarea',
				control: 'texto',
				requerido: true,
				placeholder: 'Comprar pilas, llamar al taller…'
			},
			{
				clave: 'recordatorio_en',
				etiqueta: 'Recordármelo el…',
				control: 'fecha',
				ayuda: 'Opcional: te avisará con una notificación.'
			},
			{ clave: 'hecha', etiqueta: 'Hecha', control: 'interruptor' }
		],
		resumen: (p) => (p.hecha ? '✓ ' : '') + texto(p, 'texto')
	},
	{
		tipo: 'gasto',
		nombre: 'Gasto',
		plural: 'Gastos',
		icono: 'dinero',
		tono: 'arcilla',
		visibleIaPorDefecto: true,
		descripcion: 'El dinero también cuenta tu historia.',
		campoPrincipal: 'descripcion',
		campos: [
			{ clave: 'importe', etiqueta: 'Importe (€)', control: 'moneda', requerido: true },
			{
				clave: 'categoria',
				etiqueta: 'Categoría',
				control: 'opciones',
				requerido: true,
				opciones: [
					{ valor: 'comida', texto: 'Comida' },
					{ valor: 'casa', texto: 'Casa' },
					{ valor: 'transporte', texto: 'Transporte' },
					{ valor: 'ocio', texto: 'Ocio' },
					{ valor: 'salud', texto: 'Salud' },
					{ valor: 'ropa', texto: 'Ropa' },
					{ valor: 'regalos', texto: 'Regalos' },
					{ valor: 'otros', texto: 'Otros' }
				]
			},
			{ clave: 'descripcion', etiqueta: 'Qué era', control: 'texto', placeholder: 'Cañas, gasolina…' }
		],
		resumen: (p) => {
			const importe = numero(p, 'importe');
			const partes = [
				importe !== undefined ? formatearEuros(importe) : '',
				texto(p, 'descripcion') || texto(p, 'categoria')
			].filter(Boolean);
			return partes.join(' — ');
		}
	},
	{
		tipo: 'metrica',
		nombre: 'Métricas del día',
		plural: 'Métricas diarias',
		icono: 'sol',
		tono: 'mar',
		visibleIaPorDefecto: true,
		descripcion: 'Ánimo, energía y sueño en escala 1-5. El eje X de tu vida.',
		campoPrincipal: 'notas',
		campos: [
			{ clave: 'animo', etiqueta: 'Ánimo', control: 'escala5' },
			{ clave: 'energia', etiqueta: 'Energía', control: 'escala5' },
			{ clave: 'sueno', etiqueta: 'Sueño', control: 'escala5' },
			{ clave: 'notas', etiqueta: 'Notas', control: 'texto' }
		],
		resumen: (p) => {
			const partes: string[] = [];
			const animo = numero(p, 'animo');
			const energia = numero(p, 'energia');
			const sueno = numero(p, 'sueno');
			if (animo) partes.push(`ánimo ${animo}/5`);
			if (energia) partes.push(`energía ${energia}/5`);
			if (sueno) partes.push(`sueño ${sueno}/5`);
			return partes.join(' · ') || 'Sin registrar';
		}
	},
	{
		tipo: 'frase',
		nombre: 'Frase',
		plural: 'Frases',
		icono: 'libro',
		tono: 'ciruela',
		visibleIaPorDefecto: true,
		descripcion: 'Citas y cosas que te dijeron que no quieres perder.',
		campoPrincipal: 'texto',
		campos: [
			{ clave: 'texto', etiqueta: 'La frase', control: 'textarea', requerido: true },
			{ clave: 'autor', etiqueta: 'De quién', control: 'texto' },
			{ clave: 'fuente', etiqueta: 'De dónde', control: 'texto', placeholder: 'Libro, peli, conversación…' }
		],
		resumen: (p) => {
			const autor = texto(p, 'autor');
			return `«${texto(p, 'texto')}»${autor ? ' — ' + autor : ''}`;
		}
	},
	{
		tipo: 'chiste',
		nombre: 'Chiste',
		plural: 'Chistes',
		icono: 'risa',
		tono: 'mostaza',
		visibleIaPorDefecto: true,
		descripcion: 'Para no perderlos. Reaparecen cuando hace falta una sonrisa.',
		campoPrincipal: 'texto',
		campos: [
			{ clave: 'texto', etiqueta: 'El chiste', control: 'textarea', requerido: true },
			{ clave: 'origen', etiqueta: 'De quién lo oíste', control: 'texto' }
		],
		resumen: (p) => texto(p, 'texto')
	},
	{
		tipo: 'primera_vez',
		nombre: 'Primera vez',
		plural: 'Primeras veces',
		icono: 'bandera',
		tono: 'mar',
		visibleIaPorDefecto: true,
		descripcion: 'Cada cosa que haces por primera vez. Mide la novedad de tu vida.',
		campoPrincipal: 'texto',
		campos: [
			{ clave: 'texto', etiqueta: 'Qué hiciste por primera vez', control: 'textarea', requerido: true }
		],
		resumen: (p) => texto(p, 'texto')
	},
	{
		tipo: 'suscripcion',
		nombre: 'Suscripción',
		plural: 'Suscripciones',
		icono: 'repetir',
		tono: 'arcilla',
		visibleIaPorDefecto: true,
		descripcion: 'Lo que pagas cada mes o cada año, con aviso antes del cobro.',
		campoPrincipal: 'nombre',
		campos: [
			{ clave: 'nombre', etiqueta: 'Servicio', control: 'texto', requerido: true, placeholder: 'Netflix, gimnasio…' },
			{ clave: 'precio', etiqueta: 'Precio (€)', control: 'moneda', requerido: true },
			{
				clave: 'periodicidad',
				etiqueta: 'Se cobra cada',
				control: 'opciones',
				requerido: true,
				opciones: [
					{ valor: 'mensual', texto: 'Mes' },
					{ valor: 'trimestral', texto: 'Trimestre' },
					{ valor: 'anual', texto: 'Año' }
				]
			},
			{ clave: 'proxima_renovacion', etiqueta: 'Próxima renovación', control: 'fecha', requerido: true },
			{
				clave: 'aviso_dias',
				etiqueta: 'Avisarme días antes',
				control: 'numero',
				placeholder: '3'
			},
			{ clave: 'activa', etiqueta: 'Activa', control: 'interruptor' }
		],
		resumen: (p) => {
			const precio = numero(p, 'precio');
			return `${texto(p, 'nombre')}${precio !== undefined ? ` — ${formatearEuros(precio)}/${texto(p, 'periodicidad') === 'anual' ? 'año' : texto(p, 'periodicidad') === 'trimestral' ? 'trimestre' : 'mes'}` : ''}`;
		}
	},
	{
		tipo: 'vencimiento',
		nombre: 'Vencimiento',
		plural: 'Vencimientos',
		icono: 'calendario',
		tono: 'amapola',
		visibleIaPorDefecto: true,
		descripcion: 'DNI, ITV, seguros… con aviso con antelación de verdad.',
		campoPrincipal: 'nombre',
		campos: [
			{ clave: 'nombre', etiqueta: 'Qué vence', control: 'texto', requerido: true, placeholder: 'ITV del coche' },
			{ clave: 'fecha', etiqueta: 'Fecha de vencimiento', control: 'fecha', requerido: true },
			{
				clave: 'antelacion_dias',
				etiqueta: 'Avisarme días antes',
				control: 'numero',
				placeholder: '30'
			},
			{ clave: 'notas', etiqueta: 'Notas', control: 'texto' }
		],
		resumen: (p) => texto(p, 'nombre')
	},
	{
		tipo: 'prestamo',
		nombre: 'Préstamo',
		plural: 'Préstamos',
		icono: 'intercambio',
		tono: 'arcilla',
		visibleIaPorDefecto: true,
		descripcion: '«Le dejé 50 € a Mikel el 3 de mayo.» Para que no se esfume.',
		campoPrincipal: 'notas',
		campos: [
			{ clave: 'persona', etiqueta: 'Persona', control: 'texto', requerido: true },
			{ clave: 'importe', etiqueta: 'Importe (€)', control: 'moneda', requerido: true },
			{
				clave: 'direccion',
				etiqueta: 'Dirección',
				control: 'opciones',
				requerido: true,
				opciones: [
					{ valor: 'preste', texto: 'Yo presté' },
					{ valor: 'me_prestaron', texto: 'Me prestaron' }
				]
			},
			{ clave: 'fecha', etiqueta: 'Fecha', control: 'fecha' },
			{ clave: 'devuelto', etiqueta: 'Devuelto', control: 'interruptor' },
			{ clave: 'notas', etiqueta: 'Notas', control: 'texto' }
		],
		resumen: (p) => {
			const importe = numero(p, 'importe');
			const quien = texto(p, 'persona');
			const preste = texto(p, 'direccion') === 'preste';
			return `${preste ? 'Presté' : 'Me prestó'} ${importe !== undefined ? formatearEuros(importe) : ''} ${preste ? 'a' : ''} ${quien}${p.devuelto ? ' · devuelto' : ''}`.trim();
		}
	},
	{
		tipo: 'deseo',
		nombre: 'Deseo',
		plural: 'Lista de deseos',
		icono: 'regalo',
		tono: 'ciruela',
		visibleIaPorDefecto: true,
		descripcion: 'Compras no esenciales. Esperan 30 días en la nevera.',
		campoPrincipal: 'nombre',
		campos: [
			{ clave: 'nombre', etiqueta: 'Qué es', control: 'texto', requerido: true },
			{ clave: 'precio', etiqueta: 'Precio (€)', control: 'moneda' },
			{ clave: 'url', etiqueta: 'Enlace', control: 'url' },
			{
				clave: 'estado',
				etiqueta: 'Estado',
				control: 'opciones',
				opciones: [
					{ valor: 'enfriando', texto: 'Enfriando (30 días)' },
					{ valor: 'disponible', texto: 'Listo para decidir' },
					{ valor: 'comprado', texto: 'Comprado' },
					{ valor: 'descartado', texto: 'Se me pasó (ahorrado)' }
				]
			}
		],
		resumen: (p) => {
			const precio = numero(p, 'precio');
			return `${texto(p, 'nombre')}${precio !== undefined ? ` — ${formatearEuros(precio)}` : ''}`;
		}
	},
	{
		tipo: 'pelicula',
		nombre: 'Cine y series',
		plural: 'Cine y series',
		icono: 'cine',
		tono: 'mar',
		visibleIaPorDefecto: true,
		descripcion: 'Pendientes con recomendador, vistas con nota. Tu filmoteca.',
		campoPrincipal: 'titulo',
		campos: [
			{ clave: 'titulo', etiqueta: 'Título', control: 'texto', requerido: true },
			{
				clave: 'formato',
				etiqueta: 'Formato',
				control: 'opciones',
				opciones: [
					{ valor: 'pelicula', texto: 'Película' },
					{ valor: 'serie', texto: 'Serie' }
				]
			},
			{
				clave: 'estado',
				etiqueta: 'Estado',
				control: 'opciones',
				opciones: [
					{ valor: 'pendiente', texto: 'Pendiente' },
					{ valor: 'vista', texto: 'Vista' }
				]
			},
			{ clave: 'recomendador', etiqueta: 'Quién la recomendó', control: 'texto' },
			{ clave: 'nota', etiqueta: 'Tu nota (1-10)', control: 'escala10' },
			{ clave: 'vista_en', etiqueta: 'Vista el…', control: 'fecha' },
			{ clave: 'genero', etiqueta: 'Género', control: 'texto', placeholder: 'Thriller, comedia…' },
			{ clave: 'anio', etiqueta: 'Año', control: 'numero' },
			{ clave: 'notas', etiqueta: 'Notas', control: 'texto' }
		],
		resumen: (p) => {
			const nota = numero(p, 'nota');
			const vista = texto(p, 'estado') === 'vista';
			const quien = texto(p, 'recomendador');
			if (vista) return `${texto(p, 'titulo')}${nota ? ` — ${nota}/10` : ''}`;
			return `${texto(p, 'titulo')}${quien ? ` (recomendada por ${quien})` : ''} — pendiente`;
		}
	}
];

export const TIPOS: ReadonlyMap<string, DefinicionTipo> = new Map(
	definiciones.map((d) => [d.tipo, d])
);

/** Tipos que se ofrecen en el selector rápido de captura, en orden. */
export const TIPOS_CAPTURA = [
	'nota',
	'fallo',
	'logro',
	'tarea',
	'gasto',
	'frase',
	'chiste',
	'primera_vez',
	'deseo',
	'pelicula'
] as const;

export function definicion(tipo: string): DefinicionTipo {
	return TIPOS.get(tipo) ?? (TIPOS.get('nota') as DefinicionTipo);
}

export function resumenEntrada(tipo: string, payload: Payload): string {
	try {
		return definicion(tipo).resumen(payload) || '(vacío)';
	} catch {
		return '(vacío)';
	}
}
