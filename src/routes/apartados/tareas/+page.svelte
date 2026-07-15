<script lang="ts">
	import { enhance } from '$app/forms';
	import Icono from '$lib/componentes/Icono.svelte';
	import { fechaRelativa } from '$lib/fechas';
	import type { Payload } from '$lib/tipos';

	let { data, form } = $props();

	let mostrarHechas = $state(false);
	let campoTexto = $state('');

	function textoDe(payload: unknown): string {
		return String((payload as Payload)?.texto ?? '');
	}

	function recordatorioDe(payload: unknown): string | null {
		const valor = (payload as Payload)?.recordatorio_en;
		return typeof valor === 'string' ? valor : null;
	}
</script>

<svelte:head>
	<title>BIZIYE — tareas</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Tareas</h1>
	</header>

	<form
		method="POST"
		action="?/crear"
		class="tarjeta alta"
		use:enhance={() => {
			return async ({ update }) => {
				campoTexto = '';
				await update();
			};
		}}
	>
		<input
			class="campo"
			name="texto"
			placeholder="Nueva tarea: comprar pilas, llamar al taller…"
			bind:value={campoTexto}
			aria-label="Texto de la nueva tarea"
		/>
		<div class="fila fila--separada opciones-alta">
			<label class="texto-pequeno texto-suave fila fecha-aviso">
				Avisarme el
				<input class="campo campo-fecha" type="date" name="recordatorio_en" />
			</label>
			<button class="boton boton--primario" disabled={!campoTexto.trim()}>Añadir</button>
		</div>
		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}
	</form>

	{#if data.pendientes.length === 0 && data.hechas.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">☑</div>
			<h3>Sin tareas</h3>
			<p>
				Lista simple a propósito: sin proyectos ni subtareas. Apunta lo del día a día y márcalo
				cuando caiga.
			</p>
		</section>
	{:else}
		{#if data.pendientes.length > 0}
			<section class="tarjeta lista aparece">
				{#each data.pendientes as tarea (tarea.id)}
					<div class="fila tarea">
						<form method="POST" action="?/alternar" use:enhance>
							<input type="hidden" name="id" value={tarea.id} />
							<button
								class="marcar"
								aria-label="Marcar hecha: {textoDe(tarea.payload)}"
							></button>
						</form>
						<a href="/entrada/{tarea.id}" class="texto-tarea">
							{textoDe(tarea.payload)}
							{#if recordatorioDe(tarea.payload)}
								<span class="aviso-tarea">
									<Icono nombre="campana" tamano={13} grosor={2} />
									{fechaRelativa(new Date(recordatorioDe(tarea.payload) + 'T09:00:00'))}
								</span>
							{/if}
						</a>
					</div>
				{/each}
			</section>
		{:else}
			<p class="texto-suave">Nada pendiente. Qué gusto.</p>
		{/if}

		{#if data.hechas.length > 0}
			<button class="alternar-hechas" onclick={() => (mostrarHechas = !mostrarHechas)}>
				{mostrarHechas ? 'Esconder' : 'Ver'} hechas ({data.hechas.length})
			</button>
			{#if mostrarHechas}
				<section class="tarjeta lista hechas aparece">
					{#each data.hechas as tarea (tarea.id)}
						<div class="fila tarea">
							<form method="POST" action="?/alternar" use:enhance>
								<input type="hidden" name="id" value={tarea.id} />
								<button
									class="marcar marcar--hecha"
									aria-label="Desmarcar: {textoDe(tarea.payload)}"
								>
									<Icono nombre="check" tamano={15} grosor={2.6} />
								</button>
							</form>
							<a href="/entrada/{tarea.id}" class="texto-tarea texto-hecha">
								{textoDe(tarea.payload)}
							</a>
						</div>
					{/each}
				</section>
			{/if}
		{/if}
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

	.alta {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.opciones-alta {
		flex-wrap: wrap;
	}

	.fecha-aviso {
		gap: 0.4rem;
	}

	.campo-fecha {
		width: auto;
		min-height: 40px;
		padding: 0.35rem 0.6rem;
	}

	.lista {
		display: flex;
		flex-direction: column;
		padding: 0.5rem 0.9rem;
	}

	.tarea {
		min-height: 50px;
		border-bottom: 1px solid var(--linea);
	}

	.tarea:last-child {
		border-bottom: none;
	}

	.marcar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2px solid var(--tinta-3);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.marcar:hover {
		border-color: var(--verde);
		background: var(--verde-suave);
	}

	.marcar--hecha {
		background: var(--verde);
		border-color: var(--verde);
		color: var(--verde-contraste);
	}

	.texto-tarea {
		color: inherit;
		flex: 1;
		padding: 0.5rem 0;
	}

	.texto-hecha {
		color: var(--tinta-3);
		text-decoration: line-through;
	}

	.texto-hecha:hover {
		text-decoration: line-through;
	}

	.aviso-tarea {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		margin-left: 0.5rem;
		font-size: 0.78rem;
		color: var(--aviso);
		font-weight: 600;
	}

	.alternar-hechas {
		margin: 1rem 0 0.5rem;
		color: var(--tinta-2);
		font-weight: 600;
		font-size: 0.9rem;
		min-height: 44px;
	}

	.hechas {
		opacity: 0.85;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
		margin: 0;
	}
</style>
