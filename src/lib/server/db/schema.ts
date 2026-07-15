import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

/**
 * Esquema de BIZIYE. Todas las tablas llevan user_id aunque la app sea de un
 * solo usuario (decisión de biziye.md: evitar una migración dolorosa si algún
 * día se abre a más gente).
 */

export const usuarios = pgTable('usuarios', {
	id: uuid('id').primaryKey().defaultRandom(),
	nombre: text('nombre').notNull().default('Yo'),
	passwordHash: text('password_hash').notNull(),
	creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
});

export const sesiones = pgTable('sesiones', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => usuarios.id, { onDelete: 'cascade' }),
	expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
	creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
});

/**
 * La entidad central: la entrada universal. El payload depende del tipo
 * (registro de tipos en src/lib/tipos). Soft delete vía borrado_en.
 */
export const entradas = pgTable(
	'entradas',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usuarios.id, { onDelete: 'cascade' }),
		tipo: text('tipo').notNull(),
		timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
		tags: text('tags').array().notNull().default([]),
		contexto: jsonb('contexto').notNull().default({}),
		visibleIa: boolean('visible_ia').notNull().default(true),
		payload: jsonb('payload').notNull().default({}),
		creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
		editadoEn: timestamp('editado_en', { withTimezone: true }),
		borradoEn: timestamp('borrado_en', { withTimezone: true })
	},
	(t) => [
		index('entradas_usuario_ts_idx').on(t.userId, t.timestamp.desc()),
		index('entradas_usuario_tipo_idx').on(t.userId, t.tipo, t.timestamp.desc())
	]
);

/**
 * Motor de recordatorios: pieza transversal. Cada fila es "algo que debe
 * avisar": renovación de suscripción, vencimiento, tarea, fin de enfriamiento…
 * proximo_aviso es lo que evalúa el cron; al disparar se recalcula según regla.
 */
export const recordatorios = pgTable(
	'recordatorios',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usuarios.id, { onDelete: 'cascade' }),
		entradaId: uuid('entrada_id').references(() => entradas.id, { onDelete: 'cascade' }),
		titulo: text('titulo').notNull(),
		cuerpo: text('cuerpo'),
		/** Categoría de origen: suscripcion | vencimiento | tarea | deseo | sistema */
		tipo: text('tipo').notNull().default('sistema'),
		/** Fecha del hecho en sí (la renovación, la caducidad, la cita…). */
		fechaObjetivo: timestamp('fecha_objetivo', { withTimezone: true }).notNull(),
		/** unica | diaria | semanal | mensual | anual */
		regla: text('regla').notNull().default('unica'),
		/** Días de antelación con los que avisar respecto a fecha_objetivo. */
		antelacionDias: integer('antelacion_dias').notNull().default(0),
		/** Próximo instante en el que el cron debe disparar el aviso. */
		proximoAviso: timestamp('proximo_aviso', { withTimezone: true }),
		ultimoDisparo: timestamp('ultimo_disparo', { withTimezone: true }),
		activo: boolean('activo').notNull().default(true),
		payload: jsonb('payload').notNull().default({}),
		creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('recordatorios_pendientes_idx').on(t.activo, t.proximoAviso)]
);

/** Documento-perfil que la IA mantiene sobre mí. Cada actualización = versión nueva. */
export const perfilVivo = pgTable(
	'perfil_vivo',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usuarios.id, { onDelete: 'cascade' }),
		version: integer('version').notNull(),
		contenido: text('contenido').notNull(),
		/** Qué provocó esta versión: analisis | edicion_manual | informe_mensual… */
		motivo: text('motivo').notNull().default('analisis'),
		creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('perfil_vivo_version_idx').on(t.userId, t.version)]
);

export const chatConversaciones = pgTable('chat_conversaciones', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => usuarios.id, { onDelete: 'cascade' }),
	titulo: text('titulo').notNull().default('Conversación'),
	creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
	actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow()
});

export const chatMensajes = pgTable(
	'chat_mensajes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		conversacionId: uuid('conversacion_id')
			.notNull()
			.references(() => chatConversaciones.id, { onDelete: 'cascade' }),
		/** usuario | ia | sistema */
		rol: text('rol').notNull(),
		contenido: text('contenido').notNull(),
		/** Acciones que ejecutó la IA en este turno (entradas creadas, consultas…). */
		meta: jsonb('meta').notNull().default({}),
		creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('chat_mensajes_conv_idx').on(t.conversacionId, t.creadoEn)]
);

export const pushSubscriptions = pgTable('push_subscriptions', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => usuarios.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
});

/** Configuración clave/valor por usuario (privacidad IA, notificaciones…). */
export const config = pgTable(
	'config',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => usuarios.id, { onDelete: 'cascade' }),
		clave: text('clave').notNull(),
		valor: jsonb('valor').notNull(),
		actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.clave] })]
);
