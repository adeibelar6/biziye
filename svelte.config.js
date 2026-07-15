import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		serviceWorker: {
			register: false
		},
		prerender: {
			// Solo se prerenderiza lo marcado explícitamente (p. ej. /offline).
			// Sin crawl: la home es dinámica y no debe acabar congelada en el build.
			crawl: false
		}
	}
};

export default config;
