<script lang="ts">
	import { goto } from '$app/navigation';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import { encolar } from '$lib/cliente/cola-offline';
	import { crearDictado } from '$lib/cliente/dictado.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import { TIPOS_CAPTURA, definicion } from '$lib/tipos';
	import { onMount } from 'svelte';

	let texto = $state('');
	let provisional = $state('');
	let tipoElegido = $state<string | null>(null);
	let guardando = $state(false);
	let areaTexto: HTMLTextAreaElement;

	const dictado = crearDictado((final, prov) => {
		if (final) texto = (texto ? texto.trimEnd() + ' ' : '') + final.trim();
		provisional = prov;
	});

	onMount(() => {
		areaTexto?.focus();
		return () => dictado.parar();
	});

	async function guardar() {
		const limpio = texto.trim();
		if (!limpio || guardando) return;
		guardando = true;
		dictado.parar();

		const datos = {
			texto: limpio,
			tipo: tipoElegido ?? undefined,
			timestamp: new Date().toISOString(),
			idCliente: crypto.randomUUID()
		};

		try {
			const respuesta = await fetch('/api/capturar', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(datos)
			});
			if (!respuesta.ok) throw new Error('respuesta no válida');
			const { destino } = await respuesta.json();
			avisar(
				destino === 'inbox'
					? 'Guardado en el inbox para clasificar.'
					: destino === 'clasificada'
						? 'Capturado y clasificado.'
						: 'Capturado.'
			);
		} catch {
			// Sin red (o servidor caído): a la cola offline, sin drama.
			await encolar(limpio, tipoElegido ?? undefined);
			avisar('Sin conexión: guardado en el móvil, se sincronizará solo.', 'info');
		}

		await goto('/');
	}

	function atajoTeclado(evento: KeyboardEvent) {
		if ((evento.ctrlKey || evento.metaKey) && evento.key === 'Enter') {
			evento.preventDefault();
			void guardar();
		}
	}
</script>

<svelte:head>
	<title>BIZIYE — capturar</title>
</svelte:head>

<main class="pagina captura">
	<header class="fila fila--separada">
		<h1 class="titulo-pagina">Suéltalo</h1>
		<a href="/" class="boton boton--fantasma cerrar" aria-label="Cancelar y volver">
			<Icono nombre="cruz" tamano={18} grosor={2.2} />
		</a>
	</header>

	<div class="tarjeta zona-texto">
		<textarea
			bind:this={areaTexto}
			bind:value={texto}
			onkeydown={atajoTeclado}
			class="campo texto-libre"
			rows="5"
			placeholder="¿Qué ha pasado? Un fallo, un logro, un gasto, una idea…"
			aria-label="Texto de la captura"
		></textarea>

		{#if provisional}
			<p class="provisional" aria-hidden="true">{provisional}…</p>
		{/if}

		<div class="fila fila--separada acciones-texto">
			{#if dictado.estado.disponible}
				<button
					type="button"
					class="microfono"
					class:microfono--activo={dictado.estado.escuchando}
					onclick={dictado.alternar}
					aria-pressed={dictado.estado.escuchando}
					aria-label={dictado.estado.escuchando ? 'Parar dictado' : 'Dictar por voz'}
				>
					<Icono nombre="mic" tamano={22} grosor={2} />
					{dictado.estado.escuchando ? 'Escuchando…' : 'Dictar'}
				</button>
			{:else}
				<span class="texto-suave texto-pequeno">El dictado no está disponible en este navegador.</span>
			{/if}

			<button
				type="button"
				class="boton boton--primario"
				disabled={!texto.trim() || guardando}
				onclick={guardar}
			>
				{guardando ? 'Guardando…' : 'Guardar'}
			</button>
		</div>

		{#if dictado.estado.error}
			<p class="error-dictado" role="alert">{dictado.estado.error}</p>
		{/if}
	</div>

	<section class="tipos">
		<p class="etiqueta">Tipo (opcional — sin elegir, se clasifica solo o va al inbox)</p>
		<div class="rejilla-tipos">
			{#each TIPOS_CAPTURA as tipo (tipo)}
				{@const def = definicion(tipo)}
				<button
					type="button"
					class="chip chip-tipo"
					class:chip--activo={tipoElegido === tipo}
					onclick={() => (tipoElegido = tipoElegido === tipo ? null : tipo)}
					aria-pressed={tipoElegido === tipo}
				>
					<Icono nombre={def.icono} tamano={15} grosor={2} />
					{def.nombre}
				</button>
			{/each}
		</div>
	</section>
</main>

<style>
	.captura {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.cerrar {
		min-height: 44px;
		min-width: 44px;
		padding: 0;
		border-radius: 50%;
	}

	.zona-texto {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.texto-libre {
		border: none;
		padding: 0.25rem;
		font-size: 1.15rem;
		line-height: 1.5;
		background: transparent;
	}

	.texto-libre:focus {
		outline: none;
	}

	.provisional {
		margin: 0;
		padding: 0 0.25rem;
		color: var(--tinta-3);
		font-style: italic;
	}

	.acciones-texto {
		border-top: 1px solid var(--linea);
		padding-top: 0.75rem;
	}

	.microfono {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
		padding: 0.5rem 1rem;
		border-radius: var(--radio-chip);
		font-weight: 600;
		color: var(--tinta-2);
		background: var(--superficie-2);
		transition:
			background-color 150ms ease,
			color 150ms ease;
	}

	.microfono--activo {
		background: var(--acento);
		color: var(--acento-contraste);
		animation: latido 1.6s ease-in-out infinite;
	}

	@keyframes latido {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--acento) 45%, transparent);
		}
		50% {
			box-shadow: 0 0 0 10px transparent;
		}
	}

	.error-dictado {
		color: var(--peligro);
		font-size: 0.88rem;
		margin: 0;
	}

	.rejilla-tipos {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip-tipo {
		min-height: 40px;
	}
</style>
