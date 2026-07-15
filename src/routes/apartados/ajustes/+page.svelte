<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import { TIPOS } from '$lib/tipos';

	let { data, form } = $props();

	let iaActiva = $state(true);
	$effect(() => {
		iaActiva = data.ia.activa;
	});

	const tiposConmutables = [...TIPOS.values()].filter((d) => d.tipo !== 'sin_clasificar');

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
		<h2 class="titulo-seccion">Inteligencia artificial</h2>
		<p class="texto-suave texto-pequeno explicacion">
			Proveedor configurado: <strong>{data.proveedor.nombre}</strong> — {data.proveedor.detalle}.
			Se cambia en el archivo <code>.env</code> (IA_PROVEEDOR).
		</p>
		<form
			method="POST"
			action="?/ia"
			use:enhance={() => {
				return async ({ update, result }) => {
					await update({ reset: false });
					if (result.type === 'success') avisar('Preferencias de IA guardadas.');
				};
			}}
		>
			<label class="interruptor-grande" class:interruptor-grande--apagado={!iaActiva}>
				<input type="checkbox" name="activa" bind:checked={iaActiva} />
				<span>
					<strong>{iaActiva ? 'IA encendida' : 'IA apagada del todo'}</strong>
					<small>
						{iaActiva
							? 'Clasifica capturas, responde en el chat y genera cierres e informes.'
							: 'Nada sale hacia ningún proveedor. La app entera sigue funcionando sin ella.'}
					</small>
				</span>
			</label>

			{#if iaActiva}
				<p class="etiqueta apartados-titulo">Apartados invisibles para la IA</p>
				<p class="texto-suave texto-pequeno explicacion">
					Lo que marques aquí no sale jamás hacia el proveedor: ni en el chat, ni en análisis,
					ni en informes. El filtro se aplica en la base de datos, no en el prompt.
				</p>
				<div class="rejilla-tipos">
					{#each tiposConmutables as def (def.tipo)}
						<label class="tipo-conmutable">
							<input
								type="checkbox"
								name="oculto"
								value={def.tipo}
								checked={data.ia.tiposOcultos.includes(def.tipo)}
							/>
							<span>{def.plural}</span>
						</label>
					{/each}
				</div>
			{/if}

			<button class="boton boton--suave">Guardar preferencias de IA</button>
		</form>
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

	.explicacion {
		margin-bottom: 0.75rem;
	}

	.explicacion code {
		background: var(--superficie-2);
		padding: 0.05rem 0.35rem;
		border-radius: 6px;
		font-size: 0.85em;
	}

	.interruptor-grande {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: var(--radio-s);
		background: var(--verde-suave);
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.interruptor-grande--apagado {
		background: var(--superficie-2);
	}

	.interruptor-grande input {
		width: 24px;
		height: 24px;
		accent-color: var(--verde);
		flex-shrink: 0;
	}

	.interruptor-grande span small {
		display: block;
		color: var(--tinta-2);
		font-weight: 400;
		font-size: 0.82rem;
	}

	.apartados-titulo {
		margin-top: 0.5rem;
	}

	.rejilla-tipos {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.35rem 0.75rem;
		margin-bottom: 1rem;
	}

	.tipo-conmutable {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 40px;
		font-size: 0.92rem;
		color: var(--tinta-2);
		cursor: pointer;
	}

	.tipo-conmutable input {
		width: 20px;
		height: 20px;
		accent-color: var(--acento);
		flex-shrink: 0;
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
