<script lang="ts">
	import { enhance } from '$app/forms';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import { fechaRelativa, horaCorta } from '$lib/fechas';
	import { TIPOS_CAPTURA, definicion, type Payload } from '$lib/tipos';

	let { data, form } = $props();

	function textoDe(payload: unknown): string {
		return String((payload as Payload)?.texto ?? '');
	}

	function pistaTipo(tags: string[]): string | null {
		const pista = tags.find((t) => t.startsWith('quería:'));
		return pista ? pista.slice('quería:'.length) : null;
	}
</script>

<svelte:head>
	<title>BIZIYE — inbox</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Inbox</h1>
	</header>

	{#if data.entradas.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">🧺</div>
			<h3>Inbox a cero</h3>
			<p>
				Aquí caen las capturas sin clasificar (cuando la IA duda o está apagada). Se ordenan con
				un toque y desaparecen de aquí.
			</p>
			<a class="boton boton--primario" href="/capturar">Capturar algo</a>
		</section>
	{:else}
		<p class="texto-suave">
			{data.entradas.length}
			{data.entradas.length === 1 ? 'captura por clasificar' : 'capturas por clasificar'}. Toca un
			tipo y listo.
		</p>

		<div class="columna">
			{#each data.entradas as entrada (entrada.id)}
				{@const pista = pistaTipo(entrada.tags)}
				<article class="tarjeta captura aparece">
					<a class="texto" href="/entrada/{entrada.id}">
						{textoDe(entrada.payload)}
					</a>
					<p class="cuando">
						{fechaRelativa(new Date(entrada.timestamp))} · {horaCorta(new Date(entrada.timestamp))}
						{#if pista}
							· querías guardarla como <strong>{definicion(pista).nombre}</strong> pero faltan datos —
							<a href="/entrada/{entrada.id}">rellénalos</a>
						{/if}
					</p>
					<form
						method="POST"
						action="?/clasificar"
						class="tipos"
						use:enhance={() => {
							return async ({ update, result }) => {
								await update();
								if (result.type === 'success') avisar('Clasificada.');
							};
						}}
					>
						<input type="hidden" name="id" value={entrada.id} />
						{#each TIPOS_CAPTURA.filter((t) => t !== 'nota') as tipo (tipo)}
							{@const def = definicion(tipo)}
							<button class="chip" name="tipo" value={tipo}>
								<Icono nombre={def.icono} tamano={14} grosor={2} />
								{def.nombre}
							</button>
						{/each}
						<button class="chip" name="tipo" value="nota">
							<Icono nombre="nota" tamano={14} grosor={2} />
							Nota
						</button>
					</form>
					{#if form && 'error' in form && form.error && 'id' in form && form.id === entrada.id}
						<p class="error" role="alert">{form.error}</p>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
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

	.captura {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.texto {
		color: inherit;
		font-size: 1.02rem;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	.cuando {
		margin: 0;
		font-size: 0.8rem;
		color: var(--tinta-3);
	}

	.tipos {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		border-top: 1px solid var(--linea);
		padding-top: 0.6rem;
	}

	.tipos .chip {
		min-height: 38px;
	}

	.error {
		color: var(--peligro);
		font-size: 0.85rem;
		font-weight: 600;
		margin: 0;
	}
</style>
