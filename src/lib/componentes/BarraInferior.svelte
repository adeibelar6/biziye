<script lang="ts">
	import { page } from '$app/state';
	import Icono from './Icono.svelte';

	const izquierda = [
		{ ruta: '/', icono: 'sol', texto: 'Hoy' },
		{ ruta: '/timeline', icono: 'lista', texto: 'Timeline' }
	];
	const derecha = [
		{ ruta: '/chat', icono: 'chat', texto: 'Chat' },
		{ ruta: '/apartados', icono: 'rejilla', texto: 'Apartados' }
	];

	function activa(ruta: string): boolean {
		if (ruta === '/') return page.url.pathname === '/';
		return page.url.pathname === ruta || page.url.pathname.startsWith(ruta + '/');
	}
</script>

<nav class="barra" aria-label="Navegación principal">
	{#each izquierda as elemento (elemento.ruta)}
		<a href={elemento.ruta} class="pestana" class:pestana--activa={activa(elemento.ruta)}>
			<Icono nombre={elemento.icono} tamano={22} grosor={activa(elemento.ruta) ? 2.2 : 1.8} />
			<span>{elemento.texto}</span>
		</a>
	{/each}

	<a href="/capturar" class="capturar" aria-label="Capturar algo nuevo">
		<Icono nombre="mas" tamano={26} grosor={2.4} />
	</a>

	{#each derecha as elemento (elemento.ruta)}
		<a href={elemento.ruta} class="pestana" class:pestana--activa={activa(elemento.ruta)}>
			<Icono nombre={elemento.icono} tamano={22} grosor={activa(elemento.ruta) ? 2.2 : 1.8} />
			<span>{elemento.texto}</span>
		</a>
	{/each}
</nav>

<style>
	.barra {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 50;
		display: grid;
		grid-template-columns: 1fr 1fr auto 1fr 1fr;
		align-items: center;
		gap: 0.25rem;
		height: var(--barra-inferior);
		padding: 0 0.5rem calc(env(safe-area-inset-bottom) / 2);
		background: color-mix(in srgb, var(--superficie) 88%, transparent);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-top: 1px solid var(--linea);
	}

	.pestana {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		min-height: 48px;
		justify-content: center;
		color: var(--tinta-3);
		font-size: 0.68rem;
		font-weight: 600;
		text-decoration: none;
		border-radius: var(--radio-s);
		transition: color 120ms ease;
	}

	.pestana:hover {
		text-decoration: none;
	}

	.pestana--activa {
		color: var(--tinta);
	}

	.capturar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 58px;
		height: 58px;
		margin-top: -22px;
		border-radius: 50%;
		background: var(--acento);
		color: var(--acento-contraste);
		box-shadow: var(--sombra-alta);
		transition:
			transform 140ms ease,
			background-color 140ms ease;
	}

	.capturar:hover {
		background: var(--acento-fuerte);
		text-decoration: none;
	}

	.capturar:active {
		transform: scale(0.94) rotate(90deg);
	}

	@media (min-width: 900px) {
		.barra {
			max-width: 640px;
			margin-inline: auto;
			border: 1px solid var(--linea);
			border-radius: var(--radio) var(--radio) 0 0;
		}
	}
</style>
