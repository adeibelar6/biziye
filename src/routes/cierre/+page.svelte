<script lang="ts">
	import { enhance } from '$app/forms';
	import Icono from '$lib/componentes/Icono.svelte';
	import type { Payload } from '$lib/tipos';

	let { data, form } = $props();
	let guardando = $state(false);

	function textoCierre(payload: unknown): string {
		return String((payload as Payload)?.texto ?? '');
	}
</script>

<svelte:head>
	<title>BIZIYE — cierre del día</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/" class="fila volver" aria-label="Volver a Hoy">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Cierre del día</h1>
	</header>

	{#if data.estado === 'hecho'}
		<section class="tarjeta aparece">
			<p class="hecho-titulo">
				<Icono nombre="check" tamano={18} grosor={2.4} />
				Día cerrado. Hasta mañana.
			</p>
			<pre class="texto-cierre">{textoCierre(data.cierre?.payload)}</pre>
		</section>
	{:else if data.estado === 'ia_apagada'}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">😴</div>
			<h3>Sin preguntas esta noche</h3>
			<p>
				El cierre guiado lo prepara la IA y la tienes apagada. Puedes escribir tu cierre a mano
				desde el botón de captura, o encenderla en Ajustes.
			</p>
			<a class="boton boton--suave" href="/apartados/ajustes">Ir a Ajustes</a>
		</section>
	{:else}
		<p class="texto-suave intro">
			Dos minutos, sin postureo. Según lo que has registrado hoy, esto es lo que merece pensarse:
		</p>
		<form
			method="POST"
			action="?/guardar"
			class="columna"
			use:enhance={() => {
				guardando = true;
				return async ({ update }) => {
					guardando = false;
					await update();
				};
			}}
		>
			{#each data.preguntas as pregunta, indice (pregunta)}
				<section class="tarjeta aparece">
					<label class="pregunta" for="respuesta-{indice}">{pregunta}</label>
					<input type="hidden" name="pregunta" value={pregunta} />
					<textarea
						class="campo"
						id="respuesta-{indice}"
						name="respuesta"
						rows="3"
						placeholder="Con sinceridad, que esto no lo lee nadie más…"
					></textarea>
				</section>
			{/each}

			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}

			<button class="boton boton--primario boton--bloque" disabled={guardando}>
				{guardando ? 'Guardando…' : 'Cerrar el día'}
			</button>
		</form>
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

	.intro {
		margin: 0.25rem 0 1rem;
	}

	.pregunta {
		display: block;
		font-family: var(--fuente-display);
		font-size: 1.1rem;
		font-weight: 700;
		line-height: 1.3;
		margin-bottom: 0.6rem;
	}

	.hecho-titulo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--exito);
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.texto-cierre {
		white-space: pre-wrap;
		font-family: var(--fuente-cuerpo);
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--tinta-2);
		margin: 0;
	}

	.error {
		color: var(--peligro);
		font-weight: 600;
	}
</style>
