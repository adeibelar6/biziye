<script lang="ts">
	import { enhance } from '$app/forms';
	import Icono from '$lib/componentes/Icono.svelte';
	import { diasEntre, fechaCorta } from '$lib/fechas';

	let { data, form } = $props();

	let mostrarAlta = $state(false);

	function diasHasta(fecha: string): number {
		return diasEntre(new Date(), new Date(`${fecha}T12:00:00`));
	}

	function textoPlazo(fecha: string): string {
		const dias = diasHasta(fecha);
		if (dias === 0) return '¡hoy!';
		if (dias === 1) return 'mañana';
		if (dias < 0) return `hace ${-dias} días`;
		return `en ${dias} días`;
	}
</script>

<svelte:head>
	<title>BIZIYE — vencimientos</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Vencimientos</h1>
	</header>

	<button class="boton boton--suave alta-conmutador" onclick={() => (mostrarAlta = !mostrarAlta)}>
		<Icono nombre="mas" tamano={16} grosor={2.2} />
		{mostrarAlta ? 'Cerrar' : 'Añadir vencimiento'}
	</button>

	{#if mostrarAlta}
		<form
			method="POST"
			action="?/crear"
			class="tarjeta formulario aparece"
			use:enhance={() => {
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') mostrarAlta = false;
				};
			}}
		>
			<label class="etiqueta" for="v-nombre">Qué vence</label>
			<input class="campo" id="v-nombre" name="nombre" required placeholder="ITV del coche, DNI, seguro…" />

			<div class="fila fila-campos">
				<div>
					<label class="etiqueta" for="v-fecha">Fecha de vencimiento</label>
					<input class="campo" id="v-fecha" name="fecha" type="date" required />
				</div>
				<div>
					<label class="etiqueta" for="v-antelacion">Avisarme días antes</label>
					<input class="campo" id="v-antelacion" name="antelacion_dias" type="number" min="0" value="30" />
				</div>
			</div>

			<label class="etiqueta" for="v-notas">Notas</label>
			<input class="campo" id="v-notas" name="notas" placeholder="Dónde se renueva, qué hace falta…" />

			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}
			<button class="boton boton--primario">Guardar</button>
		</form>
	{/if}

	{#if data.proximos.length === 0 && data.pasados.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">⏳</div>
			<h3>Nada que caduque a la vista</h3>
			<p>
				DNI, ITV, seguros, garantías… Apunta la fecha y la antelación, y el aviso llegará con
				tiempo de verdad, no la víspera.
			</p>
		</section>
	{:else}
		{#if data.proximos.length > 0}
			<section class="tarjeta lista aparece">
				{#each data.proximos as v (v.id)}
					<a href="/entrada/{v.id}" class="fila fila--separada vencimiento">
						<span>
							<strong>{v.payload.nombre}</strong>
							<small class="texto-suave">
								{fechaCorta(new Date(`${v.fecha}T12:00:00`))}
								{#if v.payload.antelacion_dias}
									· aviso {v.payload.antelacion_dias} días antes
								{/if}
							</small>
						</span>
						<span class="plazo" class:urgente={diasHasta(v.fecha) <= 14}>
							{textoPlazo(v.fecha)}
						</span>
					</a>
				{/each}
			</section>
		{/if}

		{#if data.pasados.length > 0}
			<h2 class="etiqueta seccion-pasados">Ya vencidos</h2>
			<section class="tarjeta lista pasados aparece">
				{#each data.pasados as v (v.id)}
					<a href="/entrada/{v.id}" class="fila fila--separada vencimiento">
						<span>
							<strong>{v.payload.nombre}</strong>
							<small class="texto-suave">{fechaCorta(new Date(`${v.fecha}T12:00:00`))}</small>
						</span>
						<span class="plazo pasado">{textoPlazo(v.fecha)}</span>
					</a>
				{/each}
			</section>
			<p class="texto-suave texto-pequeno pista">
				Un vencido se renueva editándolo con la fecha nueva (ITV del año que viene) o se borra si
				ya no aplica.
			</p>
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

	.alta-conmutador {
		margin-bottom: 0.9rem;
	}

	.formulario {
		margin-bottom: 1rem;
	}

	.fila-campos {
		gap: 0.75rem;
		align-items: flex-start;
	}

	.fila-campos > div {
		flex: 1;
	}

	.campo {
		margin-bottom: 0.75rem;
	}

	.lista {
		display: flex;
		flex-direction: column;
		padding: 0.4rem 0.9rem;
	}

	.vencimiento {
		min-height: 56px;
		border-bottom: 1px solid var(--linea);
		color: inherit;
		padding: 0.5rem 0;
	}

	.vencimiento:last-child {
		border-bottom: none;
	}

	.vencimiento small {
		display: block;
		font-size: 0.78rem;
	}

	.plazo {
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--verde);
		white-space: nowrap;
	}

	.plazo.urgente {
		color: var(--peligro);
	}

	.plazo.pasado {
		color: var(--tinta-3);
	}

	.seccion-pasados {
		margin: 1.1rem 0 0.4rem;
	}

	.pasados {
		opacity: 0.8;
	}

	.pista {
		margin-top: 0.5rem;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
	}
</style>
