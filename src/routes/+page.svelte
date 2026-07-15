<script lang="ts">
	import { fechaLarga } from '$lib/fechas';

	let { data } = $props();
</script>

<svelte:head>
	<title>BIZIYE — hoy</title>
</svelte:head>

<main class="pagina">
	<header class="saludo aparece">
		<p class="texto-suave fecha">{fechaLarga()}</p>
		<h1>{data.saludo}, {data.nombre}.</h1>
	</header>

	<section class="tarjeta estado-vacio aparece">
		<div class="estado-vacio__icono" aria-hidden="true">✦</div>
		<h3>Tu día, todavía en blanco</h3>
		<p>
			Aquí verás tu briefing: tareas, avisos y lo que la IA saque de tus datos. Empieza apuntando
			algo con el botón grande de abajo.
		</p>
		<a class="boton boton--primario" href="/capturar">Capturar lo primero</a>
	</section>
</main>

<style>
	.saludo {
		margin: 0.5rem 0 1.5rem;
	}

	.fecha {
		margin-bottom: 0.2rem;
		text-transform: capitalize;
	}

	.saludo h1 {
		font-size: clamp(2rem, 9vw, 2.6rem);
		font-weight: 800;
		letter-spacing: -0.03em;
	}
</style>
