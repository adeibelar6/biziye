<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import { TIPOS } from '$lib/tipos';

	let { data, form } = $props();

	let iaActiva = $state(true);
	$effect(() => {
		iaActiva = data.ia.activa;
	});

	const tiposConmutables = [...TIPOS.values()].filter((d) => d.tipo !== 'sin_clasificar');

	type Tema = 'sistema' | 'claro' | 'oscuro';

	let tema = $state<Tema>('sistema');

	if (browser) {
		const guardado = localStorage.getItem('biziye-tema');
		tema = guardado === 'claro' || guardado === 'oscuro' ? guardado : 'sistema';
	}

	function cambiarTema(nuevo: Tema) {
		tema = nuevo;
		if (nuevo === 'sistema') {
			localStorage.removeItem('biziye-tema');
			delete document.documentElement.dataset.theme;
		} else {
			localStorage.setItem('biziye-tema', nuevo);
			document.documentElement.dataset.theme = nuevo;
		}
	}

	// ── Notificaciones push ──────────────────────────────────────────────────
	let dispositivos = $state(0);
	let esteDispositivo = $state(false);
	let ocupadoPush = $state(false);
	$effect(() => {
		dispositivos = data.push.dispositivos;
	});

	async function registroSW(): Promise<ServiceWorkerRegistration | null> {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
		return (await navigator.serviceWorker.getRegistration()) ?? null;
	}

	// El pushManager quiere la clave VAPID como Uint8Array, no en base64url.
	function claveComoBytes(base64url: string): Uint8Array<ArrayBuffer> {
		const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
			.replace(/-/g, '+')
			.replace(/_/g, '/');
		const crudo = atob(base64);
		const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
		for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
		return bytes;
	}

	$effect(() => {
		void (async () => {
			const registro = await registroSW();
			esteDispositivo = Boolean(await registro?.pushManager.getSubscription());
		})();
	});

	async function activarAvisos() {
		if (!data.push.clavePublica) return;
		ocupadoPush = true;
		try {
			const registro = await registroSW();
			if (!registro) {
				avisar('Aquí no hay service worker: prueba desde la app instalada (o npm run preview).');
				return;
			}
			if ((await Notification.requestPermission()) !== 'granted') {
				avisar('Sin permiso de notificaciones no hay avisos. Se cambia en el navegador.');
				return;
			}
			const suscripcion = await registro.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: claveComoBytes(data.push.clavePublica)
			});
			const respuesta = await fetch('/api/push', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ suscripcion: suscripcion.toJSON() })
			});
			const datos = await respuesta.json();
			if (respuesta.ok) {
				dispositivos = datos.dispositivos;
				esteDispositivo = true;
				avisar('Avisos activados en este dispositivo.');
			} else {
				avisar(datos.error ?? 'No se pudo guardar la suscripción.');
			}
		} finally {
			ocupadoPush = false;
		}
	}

	async function desactivarAvisos() {
		ocupadoPush = true;
		try {
			const registro = await registroSW();
			const suscripcion = await registro?.pushManager.getSubscription();
			if (suscripcion) {
				await fetch('/api/push', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ endpoint: suscripcion.endpoint })
				});
				await suscripcion.unsubscribe();
				dispositivos = Math.max(0, dispositivos - 1);
			}
			esteDispositivo = false;
			avisar('Avisos desactivados en este dispositivo.');
		} finally {
			ocupadoPush = false;
		}
	}
</script>

<svelte:head>
	<title>BIZIYE — ajustes</title>
</svelte:head>

<main class="pagina columna">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Ajustes</h1>
	</header>

	<section class="tarjeta">
		<h2 class="titulo-seccion">Apariencia</h2>
		<div class="fila temas" role="radiogroup" aria-label="Tema de la interfaz">
			<button
				class="chip"
				class:chip--activo={tema === 'sistema'}
				role="radio"
				aria-checked={tema === 'sistema'}
				onclick={() => cambiarTema('sistema')}
			>
				Como el sistema
			</button>
			<button
				class="chip"
				class:chip--activo={tema === 'claro'}
				role="radio"
				aria-checked={tema === 'claro'}
				onclick={() => cambiarTema('claro')}
			>
				<Icono nombre="sol" tamano={14} grosor={2} /> Claro
			</button>
			<button
				class="chip"
				class:chip--activo={tema === 'oscuro'}
				role="radio"
				aria-checked={tema === 'oscuro'}
				onclick={() => cambiarTema('oscuro')}
			>
				<Icono nombre="luna" tamano={14} grosor={2} /> Oscuro
			</button>
		</div>
	</section>

	<section class="tarjeta">
		<h2 class="titulo-seccion">Inteligencia artificial</h2>
		<p class="texto-suave texto-pequeno explicacion">
			Proveedor configurado: <strong>{data.proveedor.nombre}</strong> — {data.proveedor.detalle}.
			Se cambia en el archivo <code>.env</code> (IA_PROVEEDOR).
		</p>
		<form
			method="POST"
			action="?/ia"
			use:enhance={() => {
				return async ({ update, result }) => {
					await update({ reset: false });
					if (result.type === 'success') avisar('Preferencias de IA guardadas.');
				};
			}}
		>
			<label class="interruptor-grande" class:interruptor-grande--apagado={!iaActiva}>
				<input type="checkbox" name="activa" bind:checked={iaActiva} />
				<span>
					<strong>{iaActiva ? 'IA encendida' : 'IA apagada del todo'}</strong>
					<small>
						{iaActiva
							? 'Clasifica capturas, responde en el chat y genera cierres e informes.'
							: 'Nada sale hacia ningún proveedor. La app entera sigue funcionando sin ella.'}
					</small>
				</span>
			</label>

			{#if iaActiva}
				<p class="etiqueta apartados-titulo">Apartados invisibles para la IA</p>
				<p class="texto-suave texto-pequeno explicacion">
					Lo que marques aquí no sale jamás hacia el proveedor: ni en el chat, ni en análisis,
					ni en informes. El filtro se aplica en la base de datos, no en el prompt.
				</p>
				<div class="rejilla-tipos">
					{#each tiposConmutables as def (def.tipo)}
						<label class="tipo-conmutable">
							<input
								type="checkbox"
								name="oculto"
								value={def.tipo}
								checked={data.ia.tiposOcultos.includes(def.tipo)}
							/>
							<span>{def.plural}</span>
						</label>
					{/each}
				</div>
			{/if}

			<button class="boton boton--suave">Guardar preferencias de IA</button>
		</form>
	</section>

	<section class="tarjeta">
		<h2 class="titulo-seccion">Notificaciones</h2>
		{#if !data.push.configurado}
			<p class="texto-suave texto-pequeno explicacion">
				Faltan las claves VAPID: ejecuta <code>npm run generar-vapid</code> y reinicia la app.
				Mientras tanto, los avisos del motor de recordatorios se quedan en el log del servidor.
			</p>
		{:else}
			<p class="texto-suave texto-pequeno explicacion">
				Renovaciones, vencimientos, tareas con fecha, deseos que terminan de enfriarse… llegan
				como notificación. {dispositivos === 0
					? 'Ningún dispositivo suscrito aún.'
					: `Dispositivos suscritos: ${dispositivos}.`}
			</p>
			<div class="fila acciones-push">
				{#if esteDispositivo}
					<button class="boton boton--suave" onclick={desactivarAvisos} disabled={ocupadoPush}>
						Desactivar en este dispositivo
					</button>
				{:else}
					<button class="boton boton--primario" onclick={activarAvisos} disabled={ocupadoPush}>
						<Icono nombre="campana" tamano={17} grosor={2} />
						Activar avisos aquí
					</button>
				{/if}
				<form
					method="POST"
					action="?/probarAviso"
					use:enhance={() => {
						return async ({ update, result }) => {
							await update({ reset: false });
							if (result.type === 'success') avisar('Aviso de prueba enviado.');
						};
					}}
				>
					<button class="boton boton--fantasma" disabled={dispositivos === 0}>Probar aviso</button>
				</form>
			</div>
			{#if form?.seccion === 'push' && form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}
		{/if}
	</section>

	<section class="tarjeta">
		<h2 class="titulo-seccion">Contraseña</h2>
		<form
			method="POST"
			action="?/contrasena"
			use:enhance={() => {
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') avisar('Contraseña cambiada.');
				};
			}}
		>
			<label class="etiqueta" for="actual">Contraseña actual</label>
			<input class="campo" id="actual" name="actual" type="password" autocomplete="current-password" required />

			<label class="etiqueta" for="nueva">Nueva contraseña</label>
			<input class="campo" id="nueva" name="nueva" type="password" autocomplete="new-password" required minlength="8" />

			<label class="etiqueta" for="repetida">Repite la nueva</label>
			<input class="campo" id="repetida" name="repetida" type="password" autocomplete="new-password" required minlength="8" />

			{#if form?.seccion === 'contrasena' && form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}

			<button class="boton boton--suave">Cambiar contraseña</button>
		</form>
	</section>

	<section class="tarjeta">
		<h2 class="titulo-seccion">Sesión</h2>
		<form method="POST" action="?/salir" use:enhance>
			<button class="boton boton--fantasma">
				<Icono nombre="salir" tamano={17} grosor={2} />
				Cerrar sesión en este dispositivo
			</button>
		</form>
	</section>
</main>

<style>
	.cabecera {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.volver {
		min-width: 44px;
		min-height: 44px;
		align-items: center;
		justify-content: center;
		color: var(--tinta-2);
	}

	.cabecera .titulo-pagina {
		margin-bottom: 0;
	}

	.titulo-seccion {
		font-size: 1.05rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.temas {
		flex-wrap: wrap;
	}

	.explicacion {
		margin-bottom: 0.75rem;
	}

	.explicacion code {
		background: var(--superficie-2);
		padding: 0.05rem 0.35rem;
		border-radius: 6px;
		font-size: 0.85em;
	}

	.interruptor-grande {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: var(--radio-s);
		background: var(--verde-suave);
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.interruptor-grande--apagado {
		background: var(--superficie-2);
	}

	.interruptor-grande input {
		width: 24px;
		height: 24px;
		accent-color: var(--verde);
		flex-shrink: 0;
	}

	.interruptor-grande span small {
		display: block;
		color: var(--tinta-2);
		font-weight: 400;
		font-size: 0.82rem;
	}

	.apartados-titulo {
		margin-top: 0.5rem;
	}

	.rejilla-tipos {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.35rem 0.75rem;
		margin-bottom: 1rem;
	}

	.tipo-conmutable {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 40px;
		font-size: 0.92rem;
		color: var(--tinta-2);
		cursor: pointer;
	}

	.tipo-conmutable input {
		width: 20px;
		height: 20px;
		accent-color: var(--acento);
		flex-shrink: 0;
	}

	.acciones-push {
		flex-wrap: wrap;
	}

	.campo {
		margin-bottom: 0.9rem;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
	}
</style>
