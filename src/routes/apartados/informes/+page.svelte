<script lang="ts">
	import { enhance } from '$app/forms';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import Markdown from '$lib/componentes/Markdown.svelte';
	import { fechaRelativa } from '$lib/fechas';

	let { data, form } = $props();

	let ocupado = $state(false);

	function nombreMes(mes: string): string {
		return new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
			new Date(`${mes}-15T12:00:00`)
		);
	}
</script>

<svelte:head>
	<title>BIZIYE — informes</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Informes</h1>
	</header>

	{#if !data.ia.activa}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">😴</div>
			<h3>La IA está apagada</h3>
			<p>
				Los informes mensuales y la revisión semanal los escribe ella. Despiértala en Ajustes
				cuando quieras leerte.
			</p>
			<a class="boton boton--primario" href="/apartados/ajustes">Ir a Ajustes</a>
		</section>
	{:else}
		<section class="bloque">
			<h2 class="titulo-seccion">Revisión semanal</h2>
			{#if form?.guardada}
				<section class="tarjeta hecha aparece">
					<p>
						<Icono nombre="check" tamano={16} grosor={2.4} />
						Revisión guardada en el timeline. Nos vemos el domingo que viene.
					</p>
				</section>
			{:else if form?.guion}
				<form method="POST" action="?/guardarRevision" class="tarjeta aparece" use:enhance>
					<Markdown texto={form.guion} />
					<input type="hidden" name="guion" value={form.guion} />
					<label class="etiqueta" for="respuestas">Tus respuestas</label>
					<textarea
						class="campo"
						id="respuestas"
						name="respuestas"
						rows="7"
						placeholder="1. Esta semana falló…"
					></textarea>
					{#if form?.error}
						<p class="error" role="alert">{form.error}</p>
					{/if}
					<button class="boton boton--primario">Guardar revisión</button>
				</form>
			{:else}
				<div class="tarjeta aparece">
					<p class="texto-suave texto-pequeno">
						Quince minutos de domingo: la IA resume la semana y te hace las cinco preguntas de
						siempre. Tus respuestas se guardan como una nota en el timeline.
						{#if data.ultimaRevision}
							Última: <a href="/entrada/{data.ultimaRevision.id}">{fechaRelativa(new Date(data.ultimaRevision.fecha))}</a>.
						{/if}
					</p>
					<form
						method="POST"
						action="?/prepararRevision"
						use:enhance={() => {
							ocupado = true;
							return async ({ update }) => {
								ocupado = false;
								await update();
							};
						}}
					>
						<button class="boton boton--primario" disabled={ocupado}>
							{ocupado ? 'Preparando…' : 'Preparar la revisión de esta semana'}
						</button>
					</form>
					{#if form?.error && !form?.guion}
						<p class="error" role="alert">{form.error}</p>
					{/if}
				</div>
			{/if}
		</section>

		<section class="bloque">
			<div class="fila fila--separada">
				<h2 class="titulo-seccion">Informe mensual</h2>
			</div>
			<nav class="fila meses" aria-label="Elegir mes">
				{#each data.meses as mes (mes)}
					<a
						class="chip"
						class:chip--activo={mes === data.mes}
						href="/apartados/informes?mes={mes}"
					>
						{nombreMes(mes)}
					</a>
				{/each}
			</nav>
			{#if data.informe}
				<section class="tarjeta aparece">
					<Markdown texto={data.informe} />
				</section>
			{:else}
				<section class="tarjeta estado-vacio aparece">
					<div class="estado-vacio__icono" aria-hidden="true">📄</div>
					<h3>Nada que contar (aún)</h3>
					<p>Este mes no tiene entradas visibles para la IA. Registra y vuelve.</p>
				</section>
			{/if}
		</section>
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

	.bloque {
		margin-bottom: 1.4rem;
	}

	.titulo-seccion {
		font-size: 1.05rem;
		font-weight: 700;
		margin-bottom: 0.6rem;
	}

	.meses {
		flex-wrap: wrap;
		margin-bottom: 0.7rem;
	}

	.meses .chip {
		text-transform: capitalize;
		text-decoration: none;
	}

	.hecha {
		color: var(--exito, var(--verde));
		font-weight: 600;
	}

	.hecha p {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.campo {
		margin: 0.4rem 0 0.75rem;
		resize: vertical;
	}

	.etiqueta {
		margin-top: 0.9rem;
		display: block;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
		margin: 0.4rem 0;
	}
</style>
