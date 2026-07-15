<script lang="ts">
	import { resumenEntrada, definicion, type Payload } from '$lib/tipos';
	import { horaCorta } from '$lib/fechas';
	import SelloTipo from './SelloTipo.svelte';
	import Icono from './Icono.svelte';

	type EntradaCliente = {
		id: string;
		tipo: string;
		timestamp: string | Date;
		tags: string[];
		payload: Payload;
		visibleIa: boolean;
	};

	let {
		entrada,
		mostrarHora = true
	}: { entrada: EntradaCliente; mostrarHora?: boolean } = $props();

	const fecha = $derived(new Date(entrada.timestamp));
	const resumen = $derived(resumenEntrada(entrada.tipo, entrada.payload));
	const def = $derived(definicion(entrada.tipo));
</script>

<a class="entrada" href="/entrada/{entrada.id}">
	<SelloTipo tipo={entrada.tipo} />
	<span class="cuerpo">
		<span class="resumen">{resumen}</span>
		<span class="meta">
			<span class="tipo-nombre">{def.nombre}</span>
			{#if mostrarHora}
				<span>· {horaCorta(fecha)}</span>
			{/if}
			{#if !entrada.visibleIa}
				<span class="privada" title="Invisible para la IA">
					<Icono nombre="ojo-tachado" tamano={13} grosor={2} /> privada
				</span>
			{/if}
			{#each entrada.tags as tag (tag)}
				<span class="tag">#{tag}</span>
			{/each}
		</span>
	</span>
</a>

<style>
	.entrada {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: var(--radio-s);
		color: inherit;
		text-decoration: none;
		transition: background-color 120ms ease;
		min-height: 44px;
	}

	.entrada:hover {
		background: var(--superficie-2);
		text-decoration: none;
	}

	.cuerpo {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.resumen {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		overflow-wrap: anywhere;
		line-height: 1.4;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: var(--tinta-3);
	}

	.tipo-nombre {
		font-weight: 600;
		color: var(--tinta-2);
	}

	.privada {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: var(--aviso);
		font-weight: 600;
	}

	.tag {
		color: var(--verde);
		font-weight: 600;
	}
</style>
