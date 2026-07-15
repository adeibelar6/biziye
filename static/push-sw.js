/**
 * Manejadores de Web Push de BIZIYE. Workbox los incorpora al service worker
 * generado vía `importScripts` (ver vite.config.ts).
 */

self.addEventListener('push', (evento) => {
	let datos = {};
	try {
		datos = evento.data ? evento.data.json() : {};
	} catch {
		datos = { titulo: 'BIZIYE', cuerpo: evento.data ? evento.data.text() : '' };
	}
	const titulo = datos.titulo || 'BIZIYE';
	evento.waitUntil(
		self.registration.showNotification(titulo, {
			body: datos.cuerpo || '',
			icon: '/iconos/icono-192.png',
			badge: '/iconos/icono-192.png',
			tag: datos.etiqueta || 'biziye',
			data: { url: datos.url || '/' }
		})
	);
});

self.addEventListener('notificationclick', (evento) => {
	evento.notification.close();
	const url = (evento.notification.data && evento.notification.data.url) || '/';
	evento.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abiertas) => {
			for (const ventana of abiertas) {
				if ('focus' in ventana) {
					ventana.navigate(url);
					return ventana.focus();
				}
			}
			return clients.openWindow(url);
		})
	);
});
