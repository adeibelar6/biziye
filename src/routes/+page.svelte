<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { avisar } from '$lib/cliente/avisos.svelte';
	import EscalaCinco from '$lib/componentes/EscalaCinco.svelte';
	import Icono from '$lib/componentes/Icono.svelte';
	import { fechaLarga, fechaRelativa } from '$lib/fechas';
	import { resumenEntrada, type Payload } from '$lib/tipos';

	let { data } = $props();

	let metricasLocales = $state<{ animo?: number; energia?: number; sueno?: number }>({});

	$effect(() => {
		metricasLocales = { ...data.metricas };
	});

	const faltanMetricas = $derived(
		!metricasLocales.animo || !metricasLocales.energia || !metricasLocales.sueno
	);

	async function registrarMetrica(clave: 'animo' | 'energia' | 'sueno', valor: number) {
		const anterior = metricasLocales[clave];
		metricasLocales[clave] = valor; // optimista
		try {
			const respuesta = await fetch('/api/metricas', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ clave, valor })
			});
			if (!respuesta.ok) throw new Error();
		} catch {
			metricasLocales[clave] = anterior;
			avisar('No se pudo guardar la métrica.', 'error');
		}
	}

	let tareasOcultas = $state<string[]>([]);

	async function completarTarea(tarea: { id: string; payload: Payload }) {
		tareasOcultas.push(tarea.id); // optimista
		try {
			const respuesta = await fetch(`/api/entradas/${tarea.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					payload: { ...tarea.payload, hecha: true, hecha_en: new Date().toISOString() }
				})
			});
			if (!respuesta.ok) throw new Error();
			avisar('Tarea hecha. Bien.');
			await invalidateAll();
		} catch {
			tareasOcultas = tareasOcultas.filter((id) => id !== tarea.id);
			avisar('No se pudo marcar la tarea.', 'error');
		}
	}

	const tareasVisibles = $derived(data.tareas.filter((t) => !tareasOcultas.includes(t.id)));

	const tituloPildora = $derived(
		data.pildora?.clase === 'tal_dia'
			? 'Tal día como hoy'
			: data.pildora?.clase === 'frase'
				? 'Una frase que guardaste'
				: 'Uno de tus chistes'
	);
</script>

<svelte:head>
	<title>BIZIYE — hoy</title>
</svelte:head>

<main class="pagina columna">
	<header class="saludo aparece">
		<p class="texto-suave fecha">{fechaLarga()}</p>
		<h1>{data.saludo}, {data.nombre}.</h1>
		<p class="texto-suave resumen-dia">
			{#if data.entradasHoy === 0}
				Hoy todavía no has apuntado nada.
			{:else if data.entradasHoy === 1}
				Hoy has apuntado 1 cosa.
			{:else}
				Hoy has apuntado {data.entradasHoy} cosas.
			{/if}
			{#if data.inbox > 0}
				<a href="/apartados/inbox">{data.inbox} sin clasificar</a>
			{/if}
		</p>
	</header>

	{#if faltanMetricas}
		<section class="tarjeta aparece">
			<h2 class="titulo-seccion">¿Cómo va el día?</h2>
			<div class="columna metricas">
				{#if !metricasLocales.animo}
					<div class="fila fila--separada metrica-fila">
						<span class="nombre-metrica">Ánimo</span>
						<EscalaCinco
							etiqueta="Ánimo"
							valor={metricasLocales.animo}
							alElegir={(v) => registrarMetrica('animo', v)}
						/>
					</div>
				{/if}
				{#if !metricasLocales.energia}
					<div class="fila fila--separada metrica-fila">
						<span class="nombre-metrica">Energía</span>
						<EscalaCinco
							etiqueta="Energía"
							valor={metricasLocales.energia}
							alElegir={(v) => registrarMetrica('energia', v)}
						/>
					</div>
				{/if}
				{#if !metricasLocales.sueno}
					<div class="fila fila--separada metrica-fila">
						<span class="nombre-metrica">Sueño</span>
						<EscalaCinco
							etiqueta="Sueño"
							valor={metricasLocales.sueno}
							alElegir={(v) => registrarMetrica('sueno', v)}
						/>
					</div>
				{/if}
			</div>
		</section>
	{:else}
		<section class="tarjeta metricas-hechas aparece">
			<span class="fila">
				<Icono nombre="check" tamano={17} grosor={2.4} />
				Métricas del día registradas: ánimo {metricasLocales.animo}/5 · energía
				{metricasLocales.energia}/5 · sueño {metricasLocales.sueno}/5
			</span>
		</section>
	{/if}

	{#if tareasVisibles.length > 0}
		<section class="tarjeta aparece">
			<div class="fila fila--separada">
				<h2 class="titulo-seccion">Pendientes</h2>
				<a href="/apartados/tareas" class="texto-pequeno ver-todas">todas</a>
			</div>
			<ul class="lista-tareas">
				{#each tareasVisibles as tarea (tarea.id)}
					{@const cargaTarea = tarea.payload as Payload}
					<li class="fila tarea">
						<button
							class="marcar"
							onclick={() => completarTarea({ id: tarea.id, payload: cargaTarea })}
							aria-label="Marcar hecha: {resumenEntrada('tarea', cargaTarea)}"
						></button>
						<a href="/entrada/{tarea.id}" class="texto-tarea">
							{resumenEntrada('tarea', cargaTarea)}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.ofrecerCierre}
		<a class="tarjeta cierre-cta aparece" href="/cierre">
			<span class="cierre-texto">
				<strong>Cierra el día</strong>
				<small>Dos o tres preguntas según lo que ha pasado hoy. Dos minutos.</small>
			</span>
			<Icono nombre="flecha-derecha" tamano={20} grosor={2.2} />
		</a>
	{/if}

	{#if data.pildora}
		<section class="tarjeta pildora aparece">
			<p class="pildora-titulo">
				<Icono nombre="pildora" tamano={15} grosor={2} />
				{tituloPildora}
				{#if data.pildora.clase === 'tal_dia'}
					<span class="cuando">({fechaRelativa(new Date(data.pildora.entrada.timestamp))})</span>
				{/if}
			</p>
			<p class="pildora-texto">
				{resumenEntrada(data.pildora.entrada.tipo, data.pildora.entrada.payload as Payload)}
			</p>
			<a class="texto-pequeno" href="/entrada/{data.pildora.entrada.id}">ver entrada</a>
		</section>
	{/if}

	{#if data.entradasHoy === 0 && tareasVisibles.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">✦</div>
			<h3>Día en blanco</h3>
			<p>
				Un fallo, un logro, un gasto, algo que te dijeron… Lo que sea: suéltalo con el botón
				grande de abajo y BIZIYE lo ordena.
			</p>
			<a class="boton boton--primario" href="/capturar">Capturar algo</a>
		</section>
	{/if}
</main>

<style>
	.saludo {
		margin: 0.5rem 0 0.25rem;
	}

	.fecha {
		margin-bottom: 0.2rem;
		text-transform: capitalize;
	}

	.saludo h1 {
		font-size: clamp(2rem, 9vw, 2.6rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		margin-bottom: 0.35rem;
	}

	.resumen-dia {
		margin: 0;
	}

	.titulo-seccion {
		font-size: 1.05rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.metricas {
		gap: 0.9rem;
	}

	.metrica-fila {
		flex-wrap: wrap;
	}

	.nombre-metrica {
		font-weight: 600;
		color: var(--tinta-2);
		min-width: 4.5rem;
	}

	.metricas-hechas {
		color: var(--exito);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.ver-todas {
		color: var(--tinta-2);
	}

	.lista-tareas {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.tarea {
		min-height: 46px;
		border-bottom: 1px solid var(--linea);
	}

	.tarea:last-child {
		border-bottom: none;
	}

	.marcar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2px solid var(--tinta-3);
		flex-shrink: 0;
		transition:
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.marcar:hover {
		border-color: var(--verde);
		background: var(--verde-suave);
	}

	.texto-tarea {
		color: inherit;
		flex: 1;
		padding: 0.5rem 0;
	}

	.cierre-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--acento-contraste);
		background: var(--acento);
		border-color: var(--acento);
	}

	.cierre-cta:hover {
		text-decoration: none;
		background: var(--acento-fuerte);
	}

	.cierre-texto {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.cierre-texto small {
		opacity: 0.85;
		font-size: 0.82rem;
	}

	.pildora {
		background: linear-gradient(
			135deg,
			var(--superficie),
			color-mix(in srgb, var(--verde-suave) 55%, var(--superficie))
		);
	}

	.pildora-titulo {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.82rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--verde);
		margin-bottom: 0.4rem;
	}

	.cuando {
		text-transform: none;
		letter-spacing: 0;
		color: var(--tinta-3);
		font-weight: 500;
	}

	.pildora-texto {
		font-family: var(--fuente-display);
		font-size: 1.15rem;
		line-height: 1.35;
		margin-bottom: 0.4rem;
	}
</style>
