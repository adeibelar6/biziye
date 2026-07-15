<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import { tick } from 'svelte';

	let { data } = $props();

	type Burbuja = { id: string; rol: string; contenido: string; enviando?: boolean };

	let mensajes = $state<Burbuja[]>([]);
	let conversacionId = $state<string | null>(null);
	let texto = $state('');
	let esperando = $state(false);
	let mostrarHistorial = $state(false);
	let zonaMensajes: HTMLElement | undefined = $state();

	$effect(() => {
		mensajes = data.actual ? [...data.actual.mensajes] : [];
		conversacionId = data.actual?.id ?? null;
		void bajarDelTodo();
	});

	async function bajarDelTodo() {
		await tick();
		zonaMensajes?.scrollTo({ top: zonaMensajes.scrollHeight });
	}

	async function enviar(evento?: SubmitEvent) {
		evento?.preventDefault();
		const limpio = texto.trim();
		if (!limpio || esperando) return;

		texto = '';
		esperando = true;
		mensajes.push({ id: `local-${Date.now()}`, rol: 'usuario', contenido: limpio });
		mensajes.push({ id: 'esperando', rol: 'ia', contenido: '…', enviando: true });
		void bajarDelTodo();

		try {
			const respuesta = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ texto: limpio, conversacionId })
			});
			const datos = await respuesta.json();
			mensajes = mensajes.filter((m) => m.id !== 'esperando');
			if (!respuesta.ok) {
				avisar(
					datos.error === 'ia_apagada'
						? 'La IA está apagada en Ajustes.'
						: 'El proveedor de IA no responde ahora mismo.',
					'error'
				);
				mensajes.pop();
				texto = limpio;
				return;
			}
			conversacionId = datos.conversacionId;
			mensajes.push({ id: `ia-${Date.now()}`, rol: 'ia', contenido: datos.respuesta });
			void bajarDelTodo();
		} catch {
			mensajes = mensajes.filter((m) => m.id !== 'esperando');
			mensajes.pop();
			texto = limpio;
			avisar('Sin conexión: el chat necesita red.', 'error');
		} finally {
			esperando = false;
		}
	}

	function nuevaConversacion() {
		mostrarHistorial = false;
		void goto('/chat');
	}

	const sugerencias = [
		'¿Cuánto he gastado este mes?',
		'Apunta que he pagado 12 € del gimnasio',
		'¿Qué veo esta noche?',
		'¿Qué tareas tengo pendientes?'
	];
</script>

<svelte:head>
	<title>BIZIYE — chat</title>
</svelte:head>

<main class="pantalla-chat">
	<header class="cabecera-chat">
		<h1>Chat</h1>
		<div class="fila">
			<button
				class="boton boton--fantasma boton-cabecera"
				onclick={() => (mostrarHistorial = !mostrarHistorial)}
				aria-expanded={mostrarHistorial}
			>
				<Icono nombre="reloj" tamano={16} grosor={2} />
				Historial
			</button>
			<button class="boton boton--suave boton-cabecera" onclick={nuevaConversacion}>
				<Icono nombre="mas" tamano={16} grosor={2.2} />
				Nueva
			</button>
		</div>
	</header>

	{#if mostrarHistorial}
		<section class="tarjeta historial aparece">
			{#if data.conversaciones.length === 0}
				<p class="texto-suave texto-pequeno sin-conversaciones">
					Aún no hay conversaciones guardadas.
				</p>
			{:else}
				{#each data.conversaciones as conversacion (conversacion.id)}
					<div class="fila fila--separada conversacion">
						<a
							href="/chat?c={conversacion.id}"
							onclick={() => (mostrarHistorial = false)}
							class="titulo-conversacion"
						>
							{conversacion.titulo}
						</a>
						<form method="POST" action="?/borrar" use:enhance>
							<input type="hidden" name="id" value={conversacion.id} />
							<button class="borrar-conversacion" aria-label="Borrar conversación">
								<Icono nombre="papelera" tamano={15} grosor={2} />
							</button>
						</form>
					</div>
				{/each}
			{/if}
		</section>
	{/if}

	{#if !data.iaActiva}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">😴</div>
			<h3>La IA está durmiendo</h3>
			<p>
				La apagaste en Ajustes, y aquí eso se respeta a rajatabla: nada sale de tu servidor.
				El resto de la app sigue funcionando a pleno pulmón, pero el chat es cosa de dos.
			</p>
			<a class="boton boton--suave" href="/apartados/ajustes">Despertarla en Ajustes</a>
		</section>
	{:else}
		<section class="mensajes" bind:this={zonaMensajes}>
			{#if mensajes.length === 0}
				<div class="tarjeta estado-vacio">
					<div class="estado-vacio__icono" aria-hidden="true">💬</div>
					<h3>La puerta universal</h3>
					<p>
						Pregunta lo que sea sobre tu vida registrada, o suéltame algo para que lo apunte.
						Proveedor actual: <strong>{data.proveedor.nombre}</strong>.
					</p>
					<div class="sugerencias">
						{#each sugerencias as sugerencia (sugerencia)}
							<button
								class="chip"
								onclick={() => {
									texto = sugerencia;
									void enviar();
								}}
							>
								{sugerencia}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				{#each mensajes as mensaje (mensaje.id)}
					<div
						class="burbuja burbuja--{mensaje.rol === 'usuario' ? 'mia' : 'ia'}"
						class:burbuja--esperando={mensaje.enviando}
					>
						{mensaje.contenido}
					</div>
				{/each}
			{/if}
		</section>

		<form class="entrada-chat" onsubmit={enviar}>
			<input
				class="campo campo-chat"
				placeholder="Pregunta o suelta algo…"
				bind:value={texto}
				aria-label="Mensaje para la IA"
			/>
			<button
				class="enviar"
				disabled={!texto.trim() || esperando}
				aria-label="Enviar mensaje"
			>
				<Icono nombre="enviar" tamano={20} grosor={2} />
			</button>
		</form>
	{/if}
</main>

<style>
	.pantalla-chat {
		display: flex;
		flex-direction: column;
		height: calc(100dvh - var(--barra-inferior));
		max-width: 640px;
		margin: 0 auto;
		padding: 1rem 1rem 0.75rem;
	}

	.cabecera-chat {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.cabecera-chat h1 {
		font-size: 1.9rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0;
	}

	.boton-cabecera {
		min-height: 40px;
		padding: 0.35rem 0.9rem;
		font-size: 0.85rem;
	}

	.historial {
		margin-bottom: 0.75rem;
		max-height: 40dvh;
		overflow-y: auto;
	}

	.sin-conversaciones {
		margin: 0;
	}

	.conversacion {
		min-height: 44px;
		border-bottom: 1px solid var(--linea);
	}

	.conversacion:last-child {
		border-bottom: none;
	}

	.titulo-conversacion {
		color: inherit;
		flex: 1;
		padding: 0.4rem 0;
	}

	.borrar-conversacion {
		color: var(--tinta-3);
		min-width: 40px;
		min-height: 40px;
	}

	.borrar-conversacion:hover {
		color: var(--peligro);
	}

	.mensajes {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.25rem 0 0.75rem;
	}

	.burbuja {
		max-width: 85%;
		padding: 0.65rem 0.9rem;
		border-radius: var(--radio);
		line-height: 1.45;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		animation: aparecer 200ms ease-out both;
	}

	.burbuja--mia {
		align-self: flex-end;
		background: var(--verde);
		color: var(--verde-contraste);
		border-bottom-right-radius: 6px;
	}

	.burbuja--ia {
		align-self: flex-start;
		background: var(--superficie);
		border: 1px solid var(--linea);
		border-bottom-left-radius: 6px;
	}

	.burbuja--esperando {
		color: var(--tinta-3);
		animation: pulso 1.2s ease-in-out infinite;
	}

	@keyframes pulso {
		50% {
			opacity: 0.45;
		}
	}

	.sugerencias {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.entrada-chat {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--linea);
	}

	.campo-chat {
		border-radius: var(--radio-chip);
		flex: 1;
	}

	.enviar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--acento);
		color: var(--acento-contraste);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition:
			background-color 130ms ease,
			transform 130ms ease;
	}

	.enviar:hover:not(:disabled) {
		background: var(--acento-fuerte);
	}

	.enviar:active {
		transform: scale(0.92);
	}

	.enviar:disabled {
		opacity: 0.45;
	}
</style>
