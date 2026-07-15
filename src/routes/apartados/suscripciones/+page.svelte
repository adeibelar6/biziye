<script lang="ts">
	import { enhance } from '$app/forms';
	import Icono from '$lib/componentes/Icono.svelte';
	import { fechaRelativa, diasEntre } from '$lib/fechas';
	import { formatearEuros } from '$lib/tipos';

	let { data, form } = $props();

	let mostrarAlta = $state(false);

	const NOMBRE_PERIODO: Record<string, string> = {
		mensual: 'mes',
		trimestral: 'trimestre',
		anual: 'año'
	};

	function periodo(p: Record<string, unknown>): string {
		return NOMBRE_PERIODO[String(p.periodicidad)] ?? 'mes';
	}

	/** «¿Sigues usándola?» a partir de los 90 días, con lo gastado estimado. */
	function preguntaUso(s: (typeof data.suscripciones)[number]): string | null {
		const dias = diasEntre(new Date(s.apuntadaEn), new Date());
		if (!s.activa || dias < 90) return null;
		const gastado = (s.costeAnual / 365) * dias;
		return `Llevas ${Math.floor(dias / 30)} meses con ella (~${formatearEuros(gastado)}). ¿La sigues usando?`;
	}
</script>

<svelte:head>
	<title>BIZIYE — suscripciones</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Suscripciones</h1>
	</header>

	{#if data.suscripciones.length > 0}
		<section class="tarjeta resumen aparece">
			<div>
				<span class="cifra">{formatearEuros(data.totalAnual)}</span>
				<span class="texto-suave texto-pequeno">al año en suscripciones activas</span>
			</div>
			<span class="texto-suave texto-pequeno equivalente">
				≈ {formatearEuros(data.totalAnual / 12)} al mes
			</span>
		</section>
	{/if}

	<button class="boton boton--suave alta-conmutador" onclick={() => (mostrarAlta = !mostrarAlta)}>
		<Icono nombre="mas" tamano={16} grosor={2.2} />
		{mostrarAlta ? 'Cerrar' : 'Añadir suscripción'}
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
			<label class="etiqueta" for="s-nombre">Servicio</label>
			<input class="campo" id="s-nombre" name="nombre" required placeholder="Netflix, gimnasio…" />

			<div class="fila fila-campos">
				<div>
					<label class="etiqueta" for="s-precio">Precio (€)</label>
					<input class="campo" id="s-precio" name="precio" inputmode="decimal" required placeholder="12,99" />
				</div>
				<div>
					<label class="etiqueta" for="s-periodicidad">Se cobra cada</label>
					<select class="campo" id="s-periodicidad" name="periodicidad">
						<option value="mensual">Mes</option>
						<option value="trimestral">Trimestre</option>
						<option value="anual">Año</option>
					</select>
				</div>
			</div>

			<div class="fila fila-campos">
				<div>
					<label class="etiqueta" for="s-renovacion">Próxima renovación</label>
					<input class="campo" id="s-renovacion" name="proxima_renovacion" type="date" required />
				</div>
				<div>
					<label class="etiqueta" for="s-aviso">Avisarme días antes</label>
					<input class="campo" id="s-aviso" name="aviso_dias" type="number" min="0" value="3" />
				</div>
			</div>

			<input type="hidden" name="activa" value="on" />
			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}
			<button class="boton boton--primario">Guardar</button>
		</form>
	{/if}

	{#if data.suscripciones.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">↻</div>
			<h3>Ninguna suscripción apuntada</h3>
			<p>
				Netflix, gimnasio, dominios, seguros… Apunta lo que se cobra solo y BIZIYE te dirá cuánto
				suma al año y te avisará antes de cada cobro.
			</p>
		</section>
	{:else}
		<section class="lista-suscripciones">
			{#each data.suscripciones as s (s.id)}
				<article class="tarjeta suscripcion aparece" class:apagada={!s.activa}>
					<div class="fila fila--separada">
						<a href="/entrada/{s.id}" class="nombre">{s.payload.nombre}</a>
						<strong class="precio">
							{formatearEuros(Number(s.payload.precio) || 0)}<small>/{periodo(s.payload)}</small>
						</strong>
					</div>
					<div class="fila fila--separada detalles">
						<span class="texto-suave texto-pequeno">
							{#if s.activa && s.proximaRenovacion}
								Se renueva {fechaRelativa(new Date(s.proximaRenovacion))} ·
								{formatearEuros(s.costeAnual)}/año
							{:else if !s.activa}
								Pausada — no cuenta ni avisa
							{/if}
						</span>
						<form method="POST" action="?/alternar" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<button class="chip">{s.activa ? 'Pausar' : 'Reactivar'}</button>
						</form>
					</div>
					{#if preguntaUso(s)}
						<p class="pregunta-uso">{preguntaUso(s)}</p>
					{/if}
				</article>
			{/each}
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

	.resumen {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.9rem;
	}

	.cifra {
		font-family: var(--fuente-display);
		font-size: 1.7rem;
		font-weight: 800;
		display: block;
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

	.lista-suscripciones {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.suscripcion.apagada {
		opacity: 0.6;
	}

	.nombre {
		font-family: var(--fuente-display);
		font-weight: 700;
		font-size: 1.02rem;
		color: inherit;
	}

	.precio small {
		font-weight: 400;
		color: var(--tinta-2);
	}

	.detalles {
		margin-top: 0.35rem;
	}

	.pregunta-uso {
		margin: 0.5rem 0 0;
		font-size: 0.83rem;
		color: var(--aviso);
		font-weight: 600;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
	}
</style>
