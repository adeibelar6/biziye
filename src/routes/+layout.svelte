<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/bricolage-grotesque';
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import BarraInferior from '$lib/componentes/BarraInferior.svelte';
	import Avisos from '$lib/componentes/Avisos.svelte';
	import { sincronizarCola } from '$lib/cliente/cola-offline';

	let { children, data } = $props();

	onMount(() => {
		if (!dev) {
			import('virtual:pwa-register').then(({ registerSW }) => {
				registerSW({ immediate: true });
			});
		}

		// Al recuperar la conexión, vacía la cola de capturas offline.
		void sincronizarCola();
		const alVolverRed = () => void sincronizarCola();
		window.addEventListener('online', alVolverRed);
		return () => window.removeEventListener('online', alVolverRed);
	});
</script>

<svelte:head>
	{#if !dev}
		<link rel="manifest" href="/manifest.webmanifest" />
	{/if}
</svelte:head>

{@render children()}

<Avisos />

{#if data.usuario}
	<BarraInferior />
{/if}
