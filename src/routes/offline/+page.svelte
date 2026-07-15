<script lang="ts">
	import { onMount } from 'svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import { contarPendientes, encolar, sincronizarCola } from '$lib/cliente/cola-offline';

	let texto = $state('');
	let pendientes = $state(0);
	let guardado = $state(false);

	async function refrescar() {
		pendientes = await contarPendientes();
	}

	onMount(() => {
		void refrescar();
		const alVolverRed = async () => {
			await sincronizarCola();
			await refrescar();
		};
		window.addEventListener('online', alVolverRed);
		return () => window.removeEventListener('online', alVolverRed);
	});

	async function guardar(evento: SubmitEvent) {
		evento.preventDefault();
		const limpio = texto.trim();
		if (!limpio) return;
		await encolar(limpio);
		texto = '';
		guardado = true;
		await refrescar();
		setTimeout(() => (guardado = false), 2500);
	}
</script>

<svelte:head>
	<title>BIZIYE — sin conexión</title>
</svelte:head>

<main class="pagina sin-red">
	<header class="cabecera">
		<h1>Sin conexión</h1>
		<p class="texto-suave">
			Da igual: apunta lo que sea. Se guardará en el móvil y se sincronizará solo cuando vuelva la
			red.
		</p>
	</header>

	<form class="tarjeta captura" onsubmit={guardar}>
		<textarea
			class="campo"
			rows="4"
			placeholder="¿Qué ha pasado?"
			bind:value={texto}
			aria-label="Texto de la captura"
		></textarea>
		<button class="boton boton--primario boton--bloque" disabled={!texto.trim()}>
			<Icono nombre="mas" tamano={18} grosor={2.4} />
			Guardar en el móvil
		</button>
	</form>

	{#if guardado}
		<p class="aviso aparece" role="status">Guardado. Se enviará al volver la conexión.</p>
	{/if}

	{#if pendientes > 0}
		<p class="texto-suave texto-pequeno pendientes">
			{pendientes}
			{pendientes === 1 ? 'captura pendiente' : 'capturas pendientes'} de sincronizar
		</p>
	{/if}

	<a class="boton boton--fantasma volver" href="/">Reintentar conexión</a>
</main>

<style>
	.sin-red {
		max-width: 420px;
		padding-top: 3rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.cabecera h1 {
		font-size: 2rem;
		font-weight: 800;
	}

	.captura {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.aviso {
		color: var(--exito);
		font-weight: 600;
		text-align: center;
	}

	.pendientes {
		text-align: center;
	}

	.volver {
		align-self: center;
	}
</style>
