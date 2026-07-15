import { abrirPglite, cargarEnv } from './entorno.mjs';

cargarEnv();

/**
 * Seed opcional de datos de demostración realistas (npm run seed).
 * - Crea el usuario «Demo» (contraseña: demo1234) solo si no hay ninguno.
 * - Reparte entradas de todos los tipos por las últimas ~3 semanas.
 * - Es idempotente a lo bruto: si ya hay entradas, no hace nada.
 * Funciona igual sobre PostgreSQL (DATABASE_URL) que sobre PGlite.
 */

async function abrirBD() {
	if (process.env.DATABASE_URL) {
		const { default: pg } = await import('pg');
		const { drizzle } = await import('drizzle-orm/node-postgres');
		const { migrate } = await import('drizzle-orm/node-postgres/migrator');
		const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
		await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
		return { query: (sql, params) => pool.query(sql, params), cerrar: () => pool.end() };
	}
	const { drizzle } = await import('drizzle-orm/pglite');
	const { migrate } = await import('drizzle-orm/pglite/migrator');
	const cliente = await abrirPglite();
	await migrate(drizzle(cliente), { migrationsFolder: 'drizzle' });
	return { query: (sql, params) => cliente.query(sql, params), cerrar: () => cliente.close() };
}

function haceDias(dias, hora = 12, minuto = 0) {
	const fecha = new Date();
	fecha.setDate(fecha.getDate() - dias);
	fecha.setHours(hora, minuto, 0, 0);
	return fecha;
}

function enDias(dias) {
	const fecha = new Date();
	fecha.setDate(fecha.getDate() + dias);
	return fecha.toISOString().slice(0, 10);
}

function diaDe(fecha) {
	const f = new Date(fecha);
	return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const bd = await abrirBD();

try {
	// Usuario (solo si la app está virgen).
	let userId;
	const usuarios = await bd.query('select id from usuarios limit 1');
	if (usuarios.rows.length > 0) {
		userId = usuarios.rows[0].id;
	} else {
		const { hash } = await import('@node-rs/argon2');
		const passwordHash = await hash('demo1234');
		const creado = await bd.query(
			'insert into usuarios (nombre, password_hash) values ($1, $2) returning id',
			['Demo', passwordHash]
		);
		userId = creado.rows[0].id;
		console.log('Usuario «Demo» creado — contraseña: demo1234');
	}

	const existentes = await bd.query(
		'select count(*)::int as total from entradas where user_id = $1',
		[userId]
	);
	if (existentes.rows[0].total > 0) {
		console.log(`Ya hay ${existentes.rows[0].total} entradas: el seed no toca nada.`);
		process.exit(0);
	}

	// [tipo, hace_dias, hora, payload, tags]
	const ENTRADAS = [
		['nota', 20, 10, { texto: 'Idea: regalar a ama una escapada a Zugarramurdi por su cumpleaños.' }, ['regalos']],
		['fallo', 18, 22, { texto: 'Salté a la defensiva en la reunión de proveedores.', disparador: 'Dormí 5 horas', situacion: 'Reunión tensa a última hora', en_su_lugar: 'Pedir 5 minutos antes de contestar' }, []],
		['logro', 17, 20, { texto: 'Terminé la propuesta dos días antes del plazo.', condiciones: 'Madrugué y sin móvil encima' }, []],
		['gasto', 16, 14, { importe: 42.5, categoria: 'comida', descripcion: 'Cena con la cuadrilla' }, []],
		['gasto', 12, 9, { importe: 55, categoria: 'transporte', descripcion: 'Gasolina' }, []],
		['gasto', 5, 13, { importe: 23.9, categoria: 'ocio', descripcion: 'Libros de segunda mano' }, []],
		['frase', 15, 18, { texto: 'Lo que no se apunta, se lo lleva el viento.', autor: 'Aitona' }, []],
		['chiste', 14, 21, { texto: '¿Qué le dice un bit a otro? Nos vemos en el bus.', origen: 'Mikel' }, []],
		['primera_vez', 13, 19, { texto: 'Primera vez haciendo pan de masa madre. Salió ladrillo, pero salió.' }, []],
		['tarea', 3, 9, { texto: 'Llamar al taller por el ruido de la correa', hecha: false, recordatorio_en: enDias(2) }, []],
		['tarea', 8, 9, { texto: 'Renovar la tarjeta del gimnasio', hecha: true, hecha_en: haceDias(6).toISOString() }, []],
		['suscripcion', 19, 12, { nombre: 'Netflix', precio: 13.99, periodicidad: 'mensual', proxima_renovacion: enDias(9), aviso_dias: 3, activa: true }, []],
		['suscripcion', 19, 12, { nombre: 'Gimnasio', precio: 39, periodicidad: 'mensual', proxima_renovacion: enDias(17), aviso_dias: 3, activa: true }, []],
		['vencimiento', 19, 12, { nombre: 'ITV de la furgoneta', fecha: enDias(25), antelacion_dias: 30, notas: 'Pedir cita en la web' }, []],
		['prestamo', 10, 16, { persona: 'Mikel', importe: 50, direccion: 'preste', fecha: diaDe(haceDias(10)), devuelto: false, notas: 'Entradas del concierto' }, []],
		['deseo', 9, 17, { nombre: 'Cámara compacta de fotos', precio: 420, estado: 'enfriando' }, []],
		['deseo', 40, 17, { nombre: 'Silla nueva de escritorio', precio: 260, estado: 'descartado' }, []],
		['pelicula', 11, 22, { titulo: 'La sociedad de la nieve', formato: 'pelicula', estado: 'vista', nota: 8, vista_en: diaDe(haceDias(11)), genero: 'drama', recomendador: 'Ane' }, []],
		['pelicula', 7, 22, { titulo: 'Shogun', formato: 'serie', estado: 'pendiente', recomendador: 'Mikel', genero: 'histórica' }, []],
		['nota', 2, 8, { texto: 'El café de la plaza nueva abre a las 7. Apuntado para los madrugones.' }, []]
	];

	// Métricas de la última semana (una por día, como hace la app).
	for (let d = 7; d >= 1; d--) {
		const fecha = haceDias(d, 22, 30);
		ENTRADAS.push([
			'metrica',
			d,
			22,
			{ animo: 2 + ((d * 3) % 4), energia: 2 + ((d * 2) % 4), sueno: 2 + (d % 4) },
			[],
			{ dia: diaDe(fecha) }
		]);
	}

	for (const [tipo, dias, hora, payload, tags, contextoExtra] of ENTRADAS) {
		const fecha = haceDias(dias, hora, Math.floor(Math.random() * 50));
		const contexto = {
			dia_semana: DIAS_SEMANA[fecha.getDay()],
			hora: fecha.getHours(),
			...(contextoExtra ?? {})
		};
		await bd.query(
			`insert into entradas (user_id, tipo, timestamp, tags, contexto, visible_ia, payload)
			 values ($1, $2, $3, $4, $5, true, $6)`,
			[userId, tipo, fecha, tags, JSON.stringify(contexto), JSON.stringify(payload)]
		);
	}

	// Recordatorios espejo de lo que avisa (la app los mantiene sola al editar;
	// aquí se siembran para que «Avisos a la vista» tenga chicha desde el minuto 1).
	const AVISOS = [
		['suscripcion', 'Netflix se renueva pronto', enDias(9), 'mensual', 3],
		['suscripcion', 'Gimnasio se renueva pronto', enDias(17), 'mensual', 3],
		['vencimiento', `ITV de la furgoneta vence pronto`, enDias(25), 'unica', 30],
		['deseo', '30 días después: ¿sigues queriendo «Cámara compacta de fotos»?', enDias(21), 'unica', 0]
	];
	for (const [tipo, titulo, fechaISO, regla, antelacion] of AVISOS) {
		const fila = await bd.query(
			`select id from entradas where user_id = $1 and tipo = $2 and payload->>'nombre' is not null
			 order by creado_en desc limit 1`,
			[userId, tipo]
		);
		const objetivo = new Date(`${fechaISO}T09:00:00`);
		const aviso = new Date(objetivo);
		aviso.setDate(aviso.getDate() - antelacion);
		await bd.query(
			`insert into recordatorios (user_id, entrada_id, titulo, tipo, fecha_objetivo, regla, antelacion_dias, proximo_aviso, activo, payload)
			 values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)`,
			[
				userId,
				fila.rows[0]?.id ?? null,
				titulo,
				tipo,
				objetivo,
				regla,
				antelacion,
				aviso > new Date() ? aviso : new Date(Date.now() + 60_000),
				JSON.stringify({ url: `/apartados/${tipo === 'deseo' ? 'deseos' : tipo === 'vencimiento' ? 'vencimientos' : 'suscripciones'}` })
			]
		);
	}

	console.log(`Seed listo: ${ENTRADAS.length} entradas de demostración.`);
} finally {
	await bd.cerrar();
}
