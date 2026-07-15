<script lang="ts">
	import { enhance } from '$app/forms';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import Markdown from '$lib/componentes/Markdown.svelte';
	import { fechaCorta, horaCorta } from '$lib/fechas';

	let { data, form } = $props();

	let editando = $state(false);
	let mostrarHistorial = $state(false);
	let ocupado = $state(false);

	const contenido = $derived(data.perfil?.contenido ?? data.contenidoInicial);

	const NOMBRE_MOTIVO: Record<string, string> = {
		analisis: 'análisis de la IA',
		cierre_dia: 'tras un cierre del día',
		manual: 'actualización pedida',
		edicion_manual: 'edición a mano'
	};
</script>

<svelte:head>
	<title>BIZIYE — perfil vivo</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Perfil vivo</h1>
	</header>

	<p class="texto-suave texto-pequeno intro">
		Lo que la IA va aprendiendo de ti, en un documento que puedes leer y corregir. Cada cambio
		guarda versión: nada se pierde.
	</p>

	{#if data.esAntigua && data.perfil}
		<div class="tarjeta antigua aparece">
			<p>
				Estás viendo la <strong>versión {data.perfil.version}</strong> ({fechaCorta(
					new Date(data.perfil.creadoEn)
				)}).
			</p>
			<a class="boton boton--suave" href="/apartados/perfil">Volver a la actual</a>
		</div>
	{/if}

	{#if editando}
		<form
			method="POST"
			action="?/editar"
			class="tarjeta aparece"
			use:enhance={() => {
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') {
						editando = false;
						avisar('Perfil guardado.');
					}
				};
			}}
		>
			<textarea class="campo editor" name="contenido" rows="16">{contenido}</textarea>
			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}
			<div class="fila acciones">
				<button class="boton boton--primario">Guardar como versión nueva</button>
				<button type="button" class="boton boton--fantasma" onclick={() => (editando = false)}>
					Cancelar
				</button>
			</div>
		</form>
	{:else}
		<section class="tarjeta aparece">
			<Markdown texto={contenido} />
		</section>

		<div class="fila acciones">
			{#if data.ia.activa && !data.esAntigua}
				<form
					method="POST"
					action="?/actualizar"
					use:enhance={() => {
						ocupado = true;
						return async ({ update, result }) => {
							ocupado = false;
							await update();
							if (result.type === 'success') avisar('Perfil actualizado por la IA.');
						};
					}}
				>
					<button class="boton boton--primario" disabled={ocupado}>
						<Icono nombre="chispa" tamano={16} grosor={2} />
						{ocupado ? 'Pensando…' : 'Actualizar con la IA'}
					</button>
				</form>
			{/if}
			{#if !data.esAntigua}
				<button class="boton boton--suave" onclick={() => (editando = true)}>
					<Icono nombre="lapiz" tamano={16} grosor={2} />
					Editar a mano
				</button>
			{/if}
		</div>
		{#if form?.error && !editando}
			<p class="error" role="alert">{form.error}</p>
		{/if}
	{/if}

	{#if data.historial.length > 0}
		<button class="alternar" onclick={() => (mostrarHistorial = !mostrarHistorial)}>
			{mostrarHistorial ? 'Esconder' : 'Ver'} historial ({data.historial.length}
			{data.historial.length === 1 ? 'versión' : 'versiones'})
		</button>
		{#if mostrarHistorial}
			<section class="tarjeta lista aparece">
				{#each data.historial as v (v.version)}
					<a
						href={v.version === data.versionActual ? '/apartados/perfil' : `/apartados/perfil?v=${v.version}`}
						class="fila fila--separada version"
					>
						<span>
							<strong>v{v.version}</strong>
							<small class="texto-suave">{NOMBRE_MOTIVO[v.motivo] ?? v.motivo}</small>
						</span>
						<span class="texto-suave texto-pequeno">
							{fechaCorta(new Date(v.creadoEn))} · {horaCorta(new Date(v.creadoEn))}
						</span>
					</a>
				{/each}
			</section>
		{/if}
	{/if}

	{#if !data.ia.activa}
		<p class="texto-suave texto-pequeno">
			La IA está apagada: el documento no se actualiza solo, pero puedes leerlo y editarlo.
		</p>
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
		margin: 0 0 0.9rem;
	}

	.antigua {
		background: var(--superficie-2);
		margin-bottom: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.antigua p {
		margin: 0;
	}

	.editor {
		font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
		font-size: 0.88rem;
		line-height: 1.5;
		resize: vertical;
		margin-bottom: 0.75rem;
	}

	.acciones {
		margin-top: 0.9rem;
		flex-wrap: wrap;
	}

	.alternar {
		margin: 1rem 0 0.5rem;
		color: var(--tinta-2);
		font-weight: 600;
		font-size: 0.9rem;
		min-height: 44px;
	}

	.lista {
		display: flex;
		flex-direction: column;
		padding: 0.4rem 0.9rem;
	}

	.version {
		min-height: 48px;
		border-bottom: 1px solid var(--linea);
		color: inherit;
	}

	.version:last-child {
		border-bottom: none;
	}

	.version small {
		display: block;
		font-size: 0.78rem;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
		margin: 0.4rem 0 0;
	}
</style>
