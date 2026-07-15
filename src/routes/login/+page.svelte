<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let enviando = $state(false);
</script>

<svelte:head>
	<title>BIZIYE — entrar</title>
</svelte:head>

<main class="portada">
	<header class="marca aparece">
		<h1>BIZIYE</h1>
		<p>Tu vida, apuntada y con respuesta.</p>
	</header>

	<section class="tarjeta formulario aparece">
		{#if data.primeraVez}
			<h2>Primer arranque</h2>
			<p class="texto-suave texto-pequeno">
				Esto es solo tuyo. Elige la contraseña que protegerá todo lo que apuntes aquí.
			</p>
			<form
				method="POST"
				action="?/crear"
				use:enhance={() => {
					enviando = true;
					return async ({ update }) => {
						enviando = false;
						await update();
					};
				}}
			>
				<label class="etiqueta" for="nombre">Tu nombre</label>
				<input class="campo" id="nombre" name="nombre" placeholder="¿Cómo te llamo?" />

				<label class="etiqueta" for="contrasena">Contraseña</label>
				<input
					class="campo"
					id="contrasena"
					name="contrasena"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
				/>

				<label class="etiqueta" for="repetida">Repite la contraseña</label>
				<input
					class="campo"
					id="repetida"
					name="repetida"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
				/>

				{#if form?.error}
					<p class="error" role="alert">{form.error}</p>
				{/if}

				<button class="boton boton--primario boton--bloque" disabled={enviando}>
					{enviando ? 'Creando…' : 'Empezar a vivir apuntando'}
				</button>
			</form>
		{:else}
			<h2>Hola otra vez</h2>
			<form
				method="POST"
				action="?/entrar"
				use:enhance={() => {
					enviando = true;
					return async ({ update }) => {
						enviando = false;
						await update();
					};
				}}
			>
				<label class="etiqueta" for="contrasena">Contraseña</label>
				<input
					class="campo"
					id="contrasena"
					name="contrasena"
					type="password"
					autocomplete="current-password"
					required
				/>

				{#if form?.error}
					<p class="error" role="alert">{form.error}</p>
				{/if}

				<button class="boton boton--primario boton--bloque" disabled={enviando}>
					{enviando ? 'Entrando…' : 'Entrar'}
				</button>
			</form>
		{/if}
	</section>
</main>

<style>
	.portada {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2rem;
		max-width: 420px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
	}

	.marca {
		text-align: center;
	}

	.marca h1 {
		font-size: clamp(3rem, 16vw, 4.5rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		margin-bottom: 0.25rem;
		color: var(--tinta);
	}

	.marca h1::after {
		content: '.';
		color: var(--acento);
	}

	.marca p {
		color: var(--tinta-2);
		font-size: 1.05rem;
		margin: 0;
	}

	.formulario {
		padding: 1.5rem;
	}

	.formulario h2 {
		font-size: 1.35rem;
	}

	.campo {
		margin-bottom: 1rem;
	}

	.error {
		color: var(--peligro);
		font-size: 0.9rem;
		font-weight: 600;
	}
</style>
