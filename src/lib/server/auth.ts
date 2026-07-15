import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { bd, tablas } from '$lib/server/db';

const DURACION_SESION_MS = 1000 * 60 * 60 * 24 * 60; // 60 días
const UMBRAL_RENOVACION_MS = 1000 * 60 * 60 * 24 * 30; // renovar si quedan < 30 días

export type UsuarioSesion = { id: string; nombre: string };

// Freno de fuerza bruta (usuario único: con esto sobra).
let fallosSeguidos = 0;
let bloqueadoHasta = 0;

export function loginBloqueado(): number {
	const restante = bloqueadoHasta - Date.now();
	return restante > 0 ? Math.ceil(restante / 1000) : 0;
}

function registrarFallo() {
	fallosSeguidos += 1;
	if (fallosSeguidos >= 5) {
		bloqueadoHasta = Date.now() + 30_000;
		fallosSeguidos = 0;
	}
}

export async function hayUsuario(): Promise<boolean> {
	const filas = await bd().select({ id: tablas.usuarios.id }).from(tablas.usuarios).limit(1);
	return filas.length > 0;
}

export async function crearUsuarioInicial(nombre: string, contrasena: string): Promise<string> {
	const passwordHash = await hash(contrasena);
	const [usuario] = await bd()
		.insert(tablas.usuarios)
		.values({ nombre: nombre.trim() || 'Yo', passwordHash })
		.returning({ id: tablas.usuarios.id });
	return usuario.id;
}

export async function verificarCredenciales(contrasena: string): Promise<UsuarioSesion | null> {
	if (loginBloqueado() > 0) return null;
	const [usuario] = await bd().select().from(tablas.usuarios).limit(1);
	if (!usuario) return null;
	const valida = await verify(usuario.passwordHash, contrasena);
	if (!valida) {
		registrarFallo();
		return null;
	}
	fallosSeguidos = 0;
	return { id: usuario.id, nombre: usuario.nombre };
}

export async function cambiarContrasena(userId: string, nueva: string): Promise<void> {
	const passwordHash = await hash(nueva);
	await bd().update(tablas.usuarios).set({ passwordHash }).where(eq(tablas.usuarios.id, userId));
}

export async function crearSesion(userId: string): Promise<{ token: string; expiraEn: Date }> {
	const token = randomBytes(32).toString('base64url');
	const expiraEn = new Date(Date.now() + DURACION_SESION_MS);
	await bd().insert(tablas.sesiones).values({ id: token, userId, expiraEn });
	return { token, expiraEn };
}

export async function validarSesion(token: string): Promise<UsuarioSesion | null> {
	const [fila] = await bd()
		.select({
			expiraEn: tablas.sesiones.expiraEn,
			usuarioId: tablas.usuarios.id,
			nombre: tablas.usuarios.nombre
		})
		.from(tablas.sesiones)
		.innerJoin(tablas.usuarios, eq(tablas.sesiones.userId, tablas.usuarios.id))
		.where(eq(tablas.sesiones.id, token))
		.limit(1);

	if (!fila) return null;

	if (fila.expiraEn.getTime() < Date.now()) {
		await bd().delete(tablas.sesiones).where(eq(tablas.sesiones.id, token));
		return null;
	}

	// Sesión deslizante: si queda poco, se alarga sola.
	if (fila.expiraEn.getTime() - Date.now() < UMBRAL_RENOVACION_MS) {
		await bd()
			.update(tablas.sesiones)
			.set({ expiraEn: new Date(Date.now() + DURACION_SESION_MS) })
			.where(eq(tablas.sesiones.id, token));
	}

	return { id: fila.usuarioId, nombre: fila.nombre };
}

export async function cerrarSesion(token: string): Promise<void> {
	await bd().delete(tablas.sesiones).where(eq(tablas.sesiones.id, token));
}
