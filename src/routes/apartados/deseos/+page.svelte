<script lang="ts">
	import { enhance } from '$app/forms';
	import Icono from '$lib/componentes/Icono.svelte';
	import { formatearEuros } from '$lib/tipos';

	let { data, form } = $props();

	let mostrarAlta = $state(false);
	let mostrarCerrados = $state(false);

	function precioDe(p: Record<string, unknown>): string {
		const precio = Number(p.precio);
		return Number.isFinite(precio) && precio > 0 ? formatearEuros(precio) : '';
	}
</script>

<svelte:head>
	<title>BIZIYE — lista de deseos</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Deseos</h1>
	</header>

	{#if data.ahorrado > 0}
		<section class="tarjeta ahorro aparece">
			<span class="cifra">{formatearEuros(data.ahorrado)}</span>
			<span class="texto-suave texto-pequeno">
				ahorrados en antojos que se enfriaron solos. La nevera funciona.
			</span>
		</section>
	{/if}

	<button class="boton boton--suave alta-conmutador" onclick={() => (mostrarAlta = !mostrarAlta)}>
		<Icono nombre="mas" tamano={16} grosor={2.2} />
		{mostrarAlta ? 'Cerrar' : 'Apuntar antojo'}
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
			<label class="etiqueta" for="d-nombre">Qué es</label>
			<input class="campo" id="d-nombre" name="nombre" required placeholder="Cámara, zapatillas, cacharro…" />

			<div class="fila fila-campos">
				<div>
					<label class="etiqueta" for="d-precio">Precio (€)</label>
					<input class="campo" id="d-precio" name="precio" inputmode="decimal" placeholder="400" />
				</div>
				<div>
					<label class="etiqueta" for="d-url">Enlace</label>
					<input class="campo" id="d-url" name="url" type="url" placeholder="https://…" />
				</div>
			</div>

			<p class="texto-suave texto-pequeno">
				Entra directo a la nevera: 30 días de enfriamiento antes de poder decidir.
			</p>
			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}
			<button class="boton boton--primario">A la nevera</button>
		</form>
	{/if}

	{#if data.enfriando.length === 0 && data.disponibles.length === 0 && data.comprados.length === 0 && data.descartados.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">❄</div>
			<h3>La nevera está vacía</h3>
			<p>
				Cada compra no esencial espera aquí 30 días. Lo que sigues queriendo después, se compra
				con cabeza; lo que se olvida, es dinero ahorrado.
			</p>
		</section>
	{:else}
		{#if data.disponibles.length > 0}
			<h2 class="etiqueta seccion">Listos para decidir</h2>
			<section class="lista-deseos">
				{#each data.disponibles as d (d.id)}
					<article class="tarjeta deseo aparece">
						<div class="fila fila--separada">
							<a href="/entrada/{d.id}" class="nombre">{d.payload.nombre}</a>
							<strong>{precioDe(d.payload)}</strong>
						</div>
						{#if d.payload.url}
							<a class="texto-pequeno enlace" href={String(d.payload.url)} target="_blank" rel="noopener noreferrer">
								Ver enlace
							</a>
						{/if}
						<div class="fila decision">
							<form method="POST" action="?/decidir" use:enhance>
								<input type="hidden" name="id" value={d.id} />
								<input type="hidden" name="decision" value="comprado" />
								<button class="boton boton--primario boton--compacto">Lo compro</button>
							</form>
							<form method="POST" action="?/decidir" use:enhance>
								<input type="hidden" name="id" value={d.id} />
								<input type="hidden" name="decision" value="descartado" />
								<button class="boton boton--fantasma boton--compacto">Se me pasó</button>
							</form>
						</div>
					</article>
				{/each}
			</section>
		{/if}

		{#if data.enfriando.length > 0}
			<h2 class="etiqueta seccion">En la nevera</h2>
			<section class="lista-deseos">
				{#each data.enfriando as d (d.id)}
					<article class="tarjeta deseo aparece">
						<div class="fila fila--separada">
							<a href="/entrada/{d.id}" class="nombre">{d.payload.nombre}</a>
							<strong>{precioDe(d.payload)}</strong>
						</div>
						<div class="fila fila--separada">
							<div class="barra" aria-hidden="true">
								<span style="width: {((30 - d.diasRestantes) / 30) * 100}%"></span>
							</div>
							<span class="texto-pequeno dias">
								{d.diasRestantes === 1 ? '1 día' : `${d.diasRestantes} días`}
							</span>
						</div>
					</article>
				{/each}
			</section>
		{/if}

		{#if data.comprados.length > 0 || data.descartados.length > 0}
			<button class="alternar" onclick={() => (mostrarCerrados = !mostrarCerrados)}>
				{mostrarCerrados ? 'Esconder' : 'Ver'} decididos ({data.comprados.length + data.descartados.length})
			</button>
			{#if mostrarCerrados}
				<section class="tarjeta lista-cerrados aparece">
					{#each data.comprados as d (d.id)}
						<a href="/entrada/{d.id}" class="fila fila--separada cerrado">
							<span>{d.payload.nombre}</span>
							<span class="chip-estado comprado">comprado</span>
						</a>
					{/each}
					{#each data.descartados as d (d.id)}
						<a href="/entrada/{d.id}" class="fila fila--separada cerrado">
							<span>{d.payload.nombre}</span>
							<span class="chip-estado descartado">
								{precioDe(d.payload) ? `${precioDe(d.payload)} ahorrados` : 'descartado'}
							</span>
						</a>
					{/each}
				</section>
			{/if}
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

	.ahorro {
		margin-bottom: 0.9rem;
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.cifra {
		font-family: var(--fuente-display);
		font-size: 1.7rem;
		font-weight: 800;
		color: var(--verde);
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

	.seccion {
		margin: 0.9rem 0 0.4rem;
	}

	.lista-deseos {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.nombre {
		font-family: var(--fuente-display);
		font-weight: 700;
		color: inherit;
	}

	.enlace {
		display: inline-block;
		margin-top: 0.2rem;
	}

	.decision {
		margin-top: 0.6rem;
	}

	.boton--compacto {
		min-height: 40px;
		padding: 0.4rem 0.9rem;
		font-size: 0.88rem;
	}

	.barra {
		flex: 1;
		height: 6px;
		background: var(--superficie-2);
		border-radius: 999px;
		overflow: hidden;
		margin-top: 0.55rem;
	}

	.barra span {
		display: block;
		height: 100%;
		background: var(--mar, var(--verde));
		border-radius: 999px;
	}

	.dias {
		color: var(--tinta-2);
		white-space: nowrap;
		margin-top: 0.45rem;
	}

	.alternar {
		margin: 1rem 0 0.5rem;
		color: var(--tinta-2);
		font-weight: 600;
		font-size: 0.9rem;
		min-height: 44px;
	}

	.lista-cerrados {
		display: flex;
		flex-direction: column;
		padding: 0.4rem 0.9rem;
	}

	.cerrado {
		min-height: 48px;
		border-bottom: 1px solid var(--linea);
		color: var(--tinta-2);
	}

	.cerrado:last-child {
		border-bottom: none;
	}

	.chip-estado {
		font-size: 0.78rem;
		font-weight: 700;
	}

	.chip-estado.comprado {
		color: var(--aviso);
	}

	.chip-estado.descartado {
		color: var(--verde);
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
	}
</style>
