import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/**
 * Genera los iconos PWA de BIZIYE a partir de un SVG dibujado aquí mismo:
 * fondo verde noche, pulso vital en rojo amapola. Sin fuentes: solo trazos.
 */

const FONDO = '#141a15';
const ACENTO = '#ef5b3a';
const CREMA = '#edecdd';

function svgIcono({ conFondo = true, margenSeguro = false } = {}) {
	const contenido = `
	<g ${margenSeguro ? 'transform="translate(76.8 76.8) scale(0.7)"' : ''}>
		<polyline
			points="70,256 175,256 215,150 275,360 315,256 380,256"
			fill="none" stroke="${ACENTO}" stroke-width="38"
			stroke-linecap="round" stroke-linejoin="round" />
		<circle cx="432" cy="256" r="24" fill="${CREMA}" />
	</g>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
	${conFondo ? `<rect width="512" height="512" rx="115" fill="${FONDO}"/>` : ''}
	${contenido}
</svg>`;
}

const carpetaIconos = fileURLToPath(new URL('../static/iconos/', import.meta.url));
await mkdir(carpetaIconos, { recursive: true });

const normal = Buffer.from(svgIcono());
const maskable = Buffer.from(svgIcono({ margenSeguro: true }).replace('rx="115"', 'rx="0"'));

await sharp(normal).resize(192, 192).png().toFile(carpetaIconos + 'icono-192.png');
await sharp(normal).resize(512, 512).png().toFile(carpetaIconos + 'icono-512.png');
await sharp(normal).resize(180, 180).png().toFile(carpetaIconos + 'icono-180.png');
await sharp(maskable).resize(512, 512).png().toFile(carpetaIconos + 'icono-maskable-512.png');

await writeFile(fileURLToPath(new URL('../static/favicon.svg', import.meta.url)), svgIcono());

console.log('Iconos generados en static/iconos y static/favicon.svg');
