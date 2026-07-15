import { spawn } from 'node:child_process';
import { cargarEnv } from './entorno.mjs';

/**
 * `vite preview` no carga .env para las variables dinámicas del servidor
 * (a diferencia de `vite dev`), así que este envoltorio lo hace antes de
 * lanzarlo. Sin él, el preview usaría otra BD distinta a la de dev.
 */
cargarEnv();

const hijo = spawn('npx', ['vite', 'preview', ...process.argv.slice(2)], {
	stdio: 'inherit',
	shell: process.platform === 'win32'
});

hijo.on('exit', (codigo) => process.exit(codigo ?? 0));
