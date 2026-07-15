/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			strategies: 'generateSW',
			manifest: {
				id: '/',
				name: 'BIZIYE',
				short_name: 'BIZIYE',
				description: 'Tu vida, apuntada y con respuesta.',
				lang: 'es',
				dir: 'ltr',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'portrait',
				theme_color: '#131a15',
				background_color: '#131a15',
				categories: ['lifestyle', 'productivity'],
				icons: [
					{ src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/iconos/icono-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				],
				shortcuts: [
					{
						name: 'Capturar',
						short_name: 'Capturar',
						description: 'Apuntar algo ahora mismo',
						url: '/capturar',
						icons: [{ src: '/iconos/icono-192.png', sizes: '192x192' }]
					}
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff2}', 'prerendered/**/*.html'],
				navigateFallback: null,
				cleanupOutdatedCaches: true,
				maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
				runtimeCaching: [
					{
						// Navegación: red primero; si no hay red, última copia en caché;
						// y si tampoco, la página offline precacheada (captura offline).
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'biziye-paginas',
							networkTimeoutSeconds: 4,
							expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 14 },
							precacheFallback: { fallbackURL: '/offline' }
						}
					}
				]
			},
			devOptions: {
				enabled: false
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		alias: {
			// Los módulos virtuales de SvelteKit no existen bajo vitest puro.
			'$env/dynamic/private': fileURLToPath(
				new URL('./src/pruebas/env-stub.ts', import.meta.url)
			),
			'$app/environment': fileURLToPath(
				new URL('./src/pruebas/app-environment-stub.ts', import.meta.url)
			)
		}
	}
});
