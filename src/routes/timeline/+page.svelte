<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icono from '$lib/componentes/Icono.svelte';
	import TarjetaEntrada from '$lib/componentes/TarjetaEntrada.svelte';
	import { diaLocal, fechaLarga, fechaRelativa } from '$lib/fechas';
	import { TIPOS, type Payload } from '$lib/tipos';

	let { data } = $props();

	type EntradaCliente = {
		id: string;
		tipo: string;
		timestamp: string | Date;
		tags: string[];
		payload: Payload;
		visibleIa: boolean;
	};

	let entradas = $state<EntradaCliente[]>([]);
	let hayMas = $state(false);
	let cargandoMas = $state(false);
	let busqueda = $state('');
	let temporizador: ReturnType<typeof setTimeout> | undefined;

	// Cada navegación (cambio de filtros) rehidrata la lista desde el servidor.
	$effect(() => {
		entradas = data.entradas as unknown as EntradaCliente[];
		hayMas = data.hayMas;
		busqueda = data.filtros.q ?? '';
	});

	const tiposFiltrables = [...TIPOS.values()].filter((d) => d.tipo !== 'sin_clasificar');

	function urlConFiltros(cambios: Record<string, string | null>): string {
		const parametros = new URLSearchParams(page.url.searchParams);
		for (const [clave, valor] of Object.entries(cambios)) {
			if (valor) parametros.set(clave, valor);
			else parametros.delete(clave);
		}
		const cadena = parametros.toString();
		return '/timeline' + (cadena ? `?${cadena}` : '');
	}

	function buscar(texto: string) {
		clearTimeout(temporizador);
		temporizador = setTimeout(() => {
			void goto(urlConFiltros({ q: texto.trim() || null }), {
				keepFocus: true,
				noScroll: true,
				replaceState: true
			});
		}, 350);
	}

	async function cargarMas() {
		if (cargandoMas || !hayMas || entradas.length === 0) return;
		cargandoMas = true;
		try {
			const ultima = entradas[entradas.length - 1];
			const parametros = new URLSearchParams();
			parametros.set('antesDe', new Date(ultima.timestamp).toISOString());
			if (data.filtros.tipo) parametros.set('tipo', data.filtros.tipo);
			if (data.filtros.q) parametros.set('q', data.filtros.q);
			if (data.filtros.tag) parametros.set('tag', data.filtros.tag);
			const respuesta = await fetch(`/api/entradas?${parametros}`);
			if (respuesta.ok) {
				const pagina = await respuesta.json();
				entradas = [...entradas, ...pagina.entradas];
				hayMas = pagina.hayMas;
			}
		} finally {
			cargandoMas = false;
		}
	}

	function observarFinal(nodo: HTMLElement) {
		const observador = new IntersectionObserver(
			(observaciones) => {
				if (observaciones.some((o) => o.isIntersecting)) void cargarMas();
			},
			{ rootMargin: '600px' }
		);
		observador.observe(nodo);
		return { destroy: () => observador.disconnect() };
	}

	/** Agrupa por día natural (Europe/Madrid) manteniendo el orden. */
	const grupos = $derived.by(() => {
		const resultado: { dia: string; titulo: string; entradas: EntradaCliente[] }[] = [];
		for (const entrada of entradas) {
			const fecha = new Date(entrada.timestamp);
			const dia = diaLocal(fecha);
			const ultimo = resultado[resultado.length - 1];
			if (ultimo && ultimo.dia === dia) {
				ultimo.entradas.push(entrada);
			} else {
				const relativa = fechaRelativa(fecha);
				const titulo =
					relativa === 'hoy' || relativa === 'ayer'
						? relativa[0].toUpperCase() + relativa.slice(1)
						: fechaLarga(fecha);
				resultado.push({ dia, titulo, entradas: [entrada] });
			}
		}
		return resultado;
	});

	const hayFiltros = $derived(Boolean(data.filtros.tipo || data.filtros.q || data.filtros.tag));
</script>

<svelte:head>
	<title>BIZIYE — timeline</title>
</svelte:head>

<main class="pagina">
	<h1 class="titulo-pagina">Timeline</h1>

	<div class="buscador">
		<Icono nombre="buscar" tamano={18} grosor={2} />
		<input
			class="campo-buscador"
			type="search"
			placeholder="Buscar en toda tu vida…"
			bind:value={busqueda}
			oninput={() => buscar(busqueda)}
			aria-label="Buscar entradas"
		/>
	</div>

	<div class="filtros" role="group" aria-label="Filtrar por tipo">
		<a href={urlConFiltros({ tipo: null })} class="chip" class:chip--activo={!data.filtros.tipo}>
			Todo
		</a>
		{#each tiposFiltrables as def (def.tipo)}
			<a
				href={urlConFiltros({ tipo: data.filtros.tipo === def.tipo ? null : def.tipo })}
				class="chip"
				class:chip--activo={data.filtros.tipo === def.tipo}
			>
				{def.plural}
			</a>
		{/each}
	</div>

	{#if data.filtros.tag}
		<p class="texto-suave texto-pequeno">
			Filtrando por etiqueta <strong>#{data.filtros.tag}</strong>
			<a href={urlConFiltros({ tag: null })}>quitar</a>
		</p>
	{/if}

	{#if grupos.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">⌛</div>
			{#if hayFiltros}
				<h3>Nada por aquí</h3>
				<p>Ninguna entrada encaja con ese filtro. Prueba con otra palabra o quita filtros.</p>
				<a class="boton boton--suave" href="/timeline">Quitar filtros</a>
			{:else}
				<h3>Tu historia empieza aquí</h3>
				<p>
					Cada cosa que captures aparecerá en esta línea temporal: tu vida entera, buscable y en
					orden.
				</p>
				<a class="boton boton--primario" href="/capturar">Capturar la primera</a>
			{/if}
		</section>
	{:else}
		{#each grupos as grupo (grupo.dia)}
			<section class="grupo">
				<h2 class="dia">{grupo.titulo}</h2>
				<div class="tarjeta lista">
					{#each grupo.entradas as entrada (entrada.id)}
						<TarjetaEntrada {entrada} />
					{/each}
				</div>
			</section>
		{/each}

		{#if hayMas}
			<div class="cargador" use:observarFinal>
				{#if cargandoMas}
					<div class="esqueleto linea-esqueleto"></div>
					<div class="esqueleto linea-esqueleto"></div>
				{:else}
					<button class="boton boton--fantasma" onclick={cargarMas}>Cargar más</button>
				{/if}
			</div>
		{/if}
	{/if}
</main>

<style>
	.buscador {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: var(--superficie);
		border: 1.5px solid var(--linea);
		border-radius: var(--radio-chip);
		padding: 0 1rem;
		margin-bottom: 0.9rem;
		color: var(--tinta-3);
	}

	.buscador:focus-within {
		border-color: var(--acento);
	}

	.campo-buscador {
		flex: 1;
		border: none;
		background: transparent;
		min-height: 46px;
		font: inherit;
		color: var(--tinta);
	}

	.campo-buscador:focus {
		outline: none;
	}

	.filtros {
		display: flex;
		gap: 0.45rem;
		overflow-x: auto;
		padding: 0.15rem 0 0.75rem;
		scrollbar-width: none;
	}

	.filtros::-webkit-scrollbar {
		display: none;
	}

	.filtros .chip {
		white-space: nowrap;
		text-decoration: none;
	}

	.grupo {
		margin-bottom: 1.1rem;
	}

	.dia {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--tinta-2);
		margin: 0 0 0.4rem 0.25rem;
		text-transform: capitalize;
	}

	.lista {
		display: flex;
		flex-direction: column;
		padding: 0.35rem;
	}

	.cargador {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 0 2rem;
	}

	.linea-esqueleto {
		height: 52px;
		width: 100%;
	}
</style>
