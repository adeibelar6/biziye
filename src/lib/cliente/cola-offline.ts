import { browser } from '$app/environment';

/**
 * Cola de capturas sin conexión (principio 1: fricción cero, con o sin red).
 * Las entradas se guardan en IndexedDB y se envían a /api/capturar cuando
 * vuelve la conexión. La sincronización es idempotente gracias a id_cliente.
 */

export type CapturaPendiente = {
	id: string;
	texto: string;
	tipo?: string;
	timestamp: string;
};

const NOMBRE_BD = 'biziye-offline';
const ALMACEN = 'cola';

function abrir(): Promise<IDBDatabase> {
	return new Promise((resolver, rechazar) => {
		const peticion = indexedDB.open(NOMBRE_BD, 1);
		peticion.onupgradeneeded = () => {
			if (!peticion.result.objectStoreNames.contains(ALMACEN)) {
				peticion.result.createObjectStore(ALMACEN, { keyPath: 'id' });
			}
		};
		peticion.onsuccess = () => resolver(peticion.result);
		peticion.onerror = () => rechazar(peticion.error);
	});
}

function transaccion<T>(
	modo: IDBTransactionMode,
	operar: (almacen: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return abrir().then(
		(bd) =>
			new Promise<T>((resolver, rechazar) => {
				const tx = bd.transaction(ALMACEN, modo);
				const peticion = operar(tx.objectStore(ALMACEN));
				peticion.onsuccess = () => resolver(peticion.result);
				peticion.onerror = () => rechazar(peticion.error);
				tx.oncomplete = () => bd.close();
			})
	);
}

export async function encolar(texto: string, tipo?: string): Promise<CapturaPendiente> {
	const pendiente: CapturaPendiente = {
		id: crypto.randomUUID(),
		texto,
		tipo,
		timestamp: new Date().toISOString()
	};
	await transaccion('readwrite', (almacen) => almacen.add(pendiente));
	avisarCambio();
	return pendiente;
}

export function listarPendientes(): Promise<CapturaPendiente[]> {
	return transaccion('readonly', (almacen) => almacen.getAll() as IDBRequest<CapturaPendiente[]>);
}

export async function contarPendientes(): Promise<number> {
	if (!browser || !('indexedDB' in globalThis)) return 0;
	try {
		return await transaccion('readonly', (almacen) => almacen.count());
	} catch {
		return 0;
	}
}

async function borrar(id: string): Promise<void> {
	await transaccion('readwrite', (almacen) => almacen.delete(id));
}

let sincronizando = false;

/**
 * Intenta enviar todo lo encolado. Devuelve cuántas se enviaron y cuántas
 * quedan. Se llama al arrancar la app y en cada evento «online».
 */
export async function sincronizarCola(): Promise<{ enviadas: number; restantes: number }> {
	if (!browser || sincronizando || !navigator.onLine) {
		return { enviadas: 0, restantes: await contarPendientes() };
	}
	sincronizando = true;
	let enviadas = 0;
	try {
		const pendientes = await listarPendientes();
		for (const pendiente of pendientes) {
			const respuesta = await fetch('/api/capturar', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					texto: pendiente.texto,
					tipo: pendiente.tipo,
					timestamp: pendiente.timestamp,
					idCliente: pendiente.id
				})
			});
			if (!respuesta.ok) break; // sin sesión o error del servidor: se reintenta más tarde
			await borrar(pendiente.id);
			enviadas += 1;
		}
	} catch {
		// Sin red de verdad: la cola espera.
	} finally {
		sincronizando = false;
		if (enviadas > 0) avisarCambio();
	}
	return { enviadas, restantes: await contarPendientes() };
}

/** Evento simple para que la UI refresque contadores de pendientes. */
function avisarCambio() {
	if (browser) window.dispatchEvent(new CustomEvent('biziye:cola-cambiada'));
}
