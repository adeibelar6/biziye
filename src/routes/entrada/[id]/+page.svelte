<script lang="ts">
	import { enhance } from '$app/forms';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import FormularioCampos from '$lib/componentes/FormularioCampos.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import SelloTipo from '$lib/componentes/SelloTipo.svelte';
	import { fechaCorta, horaCorta } from '$lib/fechas';
	import { TIPOS, definicion, type Payload } from '$lib/tipos';

	let { data, form } = $props();

	// Derivada sobrescribible: sigue a la entrada, pero el select puede cambiarla.
	let tipoActual = $derived(data.entrada.tipo);
	let confirmandoBorrado = $state(false);
	let guardando = $state(false);

	const def = $derived(definicion(tipoActual));
	const payload = $derived(data.entrada.payload as Payload);
	const fecha = $derived(new Date(data.entrada.timestamp));
	const tiposElegibles = [...TIPOS.values()].filter((d) => d.tipo !== 'sin_clasificar');

	/** datetime-local necesita YYYY-MM-DDTHH:mm en hora local. */
	function aDatetimeLocal(instante: Date): string {
		const ajustada = new Date(instante.getTime() - instante.getTimezoneOffset() * 60000);
		return ajustada.toISOString().slice(0, 16);
	}
</script>

<svelte:head>
	<title>BIZIYE — {def.nombre}</title>
</svelte:head>

<main class="pagina">
	<header class="fila fila--separada cabecera">
		<a href="/timeline" class="volver fila" aria-label="Volver al timeline">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<span class="texto-suave texto-pequeno">
			{fechaCorta(fecha)} · {horaCorta(fecha)}
		</span>
	</header>

	<div class="fila titulo-entrada">
		<SelloTipo tipo={tipoActual} tamano={20} />
		<h1 class="titulo-pagina sin-margen">{def.nombre}</h1>
	</div>

	{#if data.entrada.tipo === 'sin_clasificar'}
		<p class="pista-inbox">
			Esta captura está sin clasificar. Elige abajo el tipo que le corresponde y guarda.
		</p>
	{/if}

	<form
		method="POST"
		action="?/guardar"
		class="tarjeta formulario"
		use:enhance={() => {
			guardando = true;
			return async ({ update, result }) => {
				guardando = false;
				await update({ reset: false });
				if (result.type === 'success') avisar('Cambios guardados.');
			};
		}}
	>
		<div class="grupo-campo">
			<label class="etiqueta" for="tipo">Tipo</label>
			<select class="campo" id="tipo" name="__tipo" bind:value={tipoActual}>
				{#each tiposElegibles as opcion (opcion.tipo)}
					<option value={opcion.tipo}>{opcion.nombre}</option>
				{/each}
			</select>
		</div>

		{#key tipoActual}
			<FormularioCampos campos={def.campos} valores={payload} />
		{/key}

		<div class="grupo-campo">
			<label class="etiqueta" for="tags">Etiquetas (separadas por comas)</label>
			<input
				class="campo"
				id="tags"
				name="__tags"
				type="text"
				placeholder="trabajo, familia…"
				value={data.entrada.tags.join(', ')}
			/>
		</div>

		<div class="grupo-campo">
			<label class="etiqueta" for="cuando">Cuándo pasó</label>
			<input
				class="campo"
				id="cuando"
				name="__timestamp"
				type="datetime-local"
				value={aDatetimeLocal(fecha)}
			/>
		</div>

		<label class="privacidad" class:privacidad--privada={!data.entrada.visibleIa}>
			<input type="checkbox" name="__visibleIa" checked={data.entrada.visibleIa} />
			<span class="privacidad-icono">
				<Icono nombre={data.entrada.visibleIa ? 'ojo' : 'ojo-tachado'} tamano={20} grosor={2} />
			</span>
			<span>
				<strong>Visible para la IA</strong>
				<small>Si lo apagas, esta entrada jamás sale hacia ningún proveedor de IA.</small>
			</span>
		</label>

		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}

		<button class="boton boton--primario boton--bloque" disabled={guardando}>
			{guardando ? 'Guardando…' : 'Guardar cambios'}
		</button>
	</form>

	<div class="zona-borrado">
		{#if confirmandoBorrado}
			<form method="POST" action="?/borrar" use:enhance class="fila confirmacion">
				<span>¿Seguro?</span>
				<button class="boton boton--peligro">Sí, borrar</button>
				<button
					type="button"
					class="boton boton--fantasma"
					onclick={() => (confirmandoBorrado = false)}
				>
					No
				</button>
			</form>
		{:else}
			<button class="boton-borrar" onclick={() => (confirmandoBorrado = true)}>
				<Icono nombre="papelera" tamano={17} grosor={2} />
				Borrar esta entrada
			</button>
		{/if}
	</div>
</main>

<style>
	.cabecera {
		margin-bottom: 0.5rem;
	}

	.volver {
		min-width: 44px;
		min-height: 44px;
		align-items: center;
		justify-content: center;
		color: var(--tinta-2);
		border-radius: 50%;
	}

	.titulo-entrada {
		margin-bottom: 1rem;
	}

	.sin-margen {
		margin-bottom: 0;
	}

	.pista-inbox {
		background: var(--acento-suave);
		color: var(--acento-fuerte);
		padding: 0.7rem 1rem;
		border-radius: var(--radio-s);
		font-size: 0.92rem;
		font-weight: 600;
	}

	.formulario {
		margin-bottom: 1rem;
	}

	.privacidad {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.8rem;
		border-radius: var(--radio-s);
		background: var(--verde-suave);
		color: var(--tinta);
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.privacidad--privada {
		background: var(--acento-suave);
	}

	.privacidad input {
		width: 22px;
		height: 22px;
		accent-color: var(--verde);
		flex-shrink: 0;
	}

	.privacidad-icono {
		color: var(--tinta-2);
		flex-shrink: 0;
	}

	.privacidad span small {
		display: block;
		color: var(--tinta-2);
		font-weight: 400;
		font-size: 0.8rem;
	}

	.error {
		color: var(--peligro);
		font-weight: 600;
		font-size: 0.9rem;
	}

	.zona-borrado {
		display: flex;
		justify-content: center;
		padding-bottom: 1rem;
	}

	.boton-borrar {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--peligro);
		font-weight: 600;
		font-size: 0.92rem;
		min-height: 44px;
		padding: 0 1rem;
	}

	.confirmacion {
		justify-content: center;
	}
</style>
