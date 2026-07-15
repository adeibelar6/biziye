import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

/**
 * Genera el par de claves VAPID para Web Push y, si .env existe y no las
 * tiene, las escribe ahí directamente.
 */

const claves = webpush.generateVAPIDKeys();

console.log('Claves VAPID generadas:');
console.log('  VAPID_PUBLIC_KEY=' + claves.publicKey);
console.log('  VAPID_PRIVATE_KEY=' + claves.privateKey);

const rutaEnv = fileURLToPath(new URL('../.env', import.meta.url));

if (existsSync(rutaEnv)) {
	const contenido = readFileSync(rutaEnv, 'utf8');
	const tienePublica = /^VAPID_PUBLIC_KEY=.+$/m.test(contenido);
	const tienePrivada = /^VAPID_PRIVATE_KEY=.+$/m.test(contenido);
	if (tienePublica || tienePrivada) {
		console.log('\nTu .env ya tiene claves VAPID; no lo toco.');
		console.log('Sustitúyelas a mano si quieres regenerarlas (los móviles tendrán que resuscribirse).');
	} else {
		const sinVacias = contenido
			.replace(/^VAPID_PUBLIC_KEY=$/m, '')
			.replace(/^VAPID_PRIVATE_KEY=$/m, '')
			.replace(/\n{3,}/g, '\n\n');
		writeFileSync(
			rutaEnv,
			sinVacias.trimEnd() +
				`\nVAPID_PUBLIC_KEY=${claves.publicKey}\nVAPID_PRIVATE_KEY=${claves.privateKey}\n`
		);
		console.log('\nEscritas en .env — reinicia la app para que las use.');
	}
} else {
	console.log('\nNo hay .env: copia las líneas de arriba a tu configuración.');
}
