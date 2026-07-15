<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';

	let { form } = $props();

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

	.campo {
		margin-bottom: 0.9rem;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
	}
</style>
