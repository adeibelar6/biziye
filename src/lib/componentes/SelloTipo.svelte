<script lang="ts">
	import { definicion } from '$lib/tipos';
	import Icono from './Icono.svelte';

	let { tipo, tamano = 18 }: { tipo: string; tamano?: number } = $props();

	const def = $derived(definicion(tipo));
</script>

<span class="sello sello--{def.tono}" title={def.nombre}>
	<Icono nombre={def.icono} tamano={tamano} grosor={2} />
</span>
