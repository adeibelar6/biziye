<script lang="ts">
	import Icono from '$lib/componentes/Icono.svelte';

	let { data } = $props();

	const modulos = $derived([
		{
			ruta: '/apartados/inbox',
			icono: 'inbox',
			nombre: 'Inbox',
			descripcion: 'Capturas por clasificar',
			badge: data.inbox > 0 ? data.inbox : null
		},
		{
			ruta: '/apartados/tareas',
			icono: 'check',
			nombre: 'Tareas',
			descripcion: 'Lista simple, sin proyectos',
			badge: null
		},
		{
			ruta: '/apartados/cine',
			icono: 'cine',
			nombre: 'Cine y series',
			descripcion: 'Pendientes, ranking y estadísticas',
			badge: null
		},
		{
			ruta: '/apartados/suscripciones',
			icono: 'repetir',
			nombre: 'Suscripciones',
			descripcion: 'Lo que se cobra solo, con aviso',
			badge: null
		},
		{
			ruta: '/apartados/vencimientos',
			icono: 'calendario',
			nombre: 'Vencimientos',
			descripcion: 'DNI, ITV, seguros… con antelación',
			badge: null
		},
		{
			ruta: '/apartados/prestamos',
			icono: 'intercambio',
			nombre: 'Préstamos',
			descripcion: 'Quién debe qué a quién',
			badge: null
		},
		{
			ruta: '/apartados/deseos',
			icono: 'regalo',
			nombre: 'Deseos',
			descripcion: 'Antojos con 30 días de nevera',
			badge: data.deseosListos > 0 ? data.deseosListos : null
		},
		{
			ruta: '/apartados/ajustes',
			icono: 'ajustes',
			nombre: 'Ajustes',
			descripcion: 'Tema, avisos, contraseña, privacidad',
			badge: null
		}
	]);
</script>

<svelte:head>
	<title>BIZIYE — apartados</title>
</svelte:head>

<main class="pagina">
	<h1 class="titulo-pagina">Apartados</h1>
	<div class="rejilla">
		{#each modulos as modulo (modulo.ruta)}
			<a class="tarjeta modulo aparece" href={modulo.ruta}>
				<span class="icono-modulo">
					<Icono nombre={modulo.icono} tamano={24} grosor={1.9} />
				</span>
				<span class="nombre">
					{modulo.nombre}
					{#if modulo.badge}
						<span class="badge">{modulo.badge}</span>
					{/if}
				</span>
				<span class="descripcion">{modulo.descripcion}</span>
			</a>
		{/each}
	</div>
	<p class="texto-suave texto-pequeno nota-crecimiento">
		El perfil vivo y los informes de la IA llegan en la siguiente fase.
	</p>
</main>

<style>
	.rejilla {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.8rem;
	}

	@media (min-width: 640px) {
		.rejilla {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.modulo {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		text-decoration: none;
		color: inherit;
		min-height: 120px;
		transition:
			transform 140ms ease,
			box-shadow 140ms ease;
	}

	.modulo:hover {
		text-decoration: none;
		transform: translateY(-2px);
		box-shadow: var(--sombra-alta);
	}

	.icono-modulo {
		color: var(--verde);
	}

	.nombre {
		font-family: var(--fuente-display);
		font-weight: 700;
		font-size: 1.05rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.badge {
		background: var(--acento);
		color: var(--acento-contraste);
		font-size: 0.72rem;
		font-weight: 700;
		border-radius: var(--radio-chip);
		padding: 0.1rem 0.5rem;
		font-family: var(--fuente-cuerpo);
	}

	.descripcion {
		font-size: 0.82rem;
		color: var(--tinta-2);
	}

	.nota-crecimiento {
		margin-top: 1rem;
		text-align: center;
	}
</style>
