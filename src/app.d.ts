import type { UsuarioSesion } from '$lib/server/auth';

declare global {
	namespace App {
		interface Locals {
			usuario: UsuarioSesion | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
