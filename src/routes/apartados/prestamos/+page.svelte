<script lang="ts">
	import { enhance } from '$app/forms';
	import Icono from '$lib/componentes/Icono.svelte';
	import { fechaRelativa } from '$lib/fechas';
	import { formatearEuros } from '$lib/tipos';

	let { data, form } = $props();

	let mostrarAlta = $state(false);
	let mostrarDevueltos = $state(false);

	function resumen(p: Record<string, unknown>): string {
		const preste = p.direccion === 'preste';
		return `${preste ? 'Le dejaste' : 'Te dejó'} ${formatearEuros(Number(p.importe) || 0)}`;
	}
</script>

<svelte:head>
	<title>BIZIYE — préstamos</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Préstamos</h1>
	</header>

	{#if data.saldos.porPersona.length > 0}
		<section class="tarjeta resumen aparece">
			{#each data.saldos.porPersona as s (s.persona)}
				<div class="fila fila--separada persona">
					<span>{s.persona}</span>
					<strong class:positivo={s.saldo > 0} class:negativo={s.saldo < 0}>
						{s.saldo > 0 ? 'te debe' : 'le debes'} {formatearEuros(Math.abs(s.saldo))}
					</strong>
				</div>
			{/each}
		</section>
	{/if}

	<button class="boton boton--suave alta-conmutador" onclick={() => (mostrarAlta = !mostrarAlta)}>
		<Icono nombre="mas" tamano={16} grosor={2.2} />
		{mostrarAlta ? 'Cerrar' : 'Apuntar préstamo'}
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
			<div class="fila fila-campos">
				<div>
					<label class="etiqueta" for="p-persona">Persona</label>
					<input class="campo" id="p-persona" name="persona" required placeholder="Mikel" />
				</div>
				<div>
					<label class="etiqueta" for="p-importe">Importe (€)</label>
					<input class="campo" id="p-importe" name="importe" inputmode="decimal" required placeholder="50" />
				</div>
			</div>

			<div class="fila fila-campos">
				<div>
					<label class="etiqueta" for="p-direccion">Dirección</label>
					<select class="campo" id="p-direccion" name="direccion">
						<option value="preste">Yo presté</option>
						<option value="me_prestaron">Me prestaron</option>
					</select>
				</div>
				<div>
					<label class="etiqueta" for="p-fecha">Fecha</label>
					<input class="campo" id="p-fecha" name="fecha" type="date" />
				</div>
			</div>

			<label class="etiqueta" for="p-notas">Notas</label>
			<input class="campo" id="p-notas" name="notas" placeholder="Para qué era…" />

			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}
			<button class="boton boton--primario">Guardar</button>
		</form>
	{/if}

	{#if data.pendientes.length === 0 && data.devueltos.length === 0}
		<section class="tarjeta estado-vacio aparece">
			<div class="estado-vacio__icono" aria-hidden="true">⇄</div>
			<h3>Sin cuentas pendientes</h3>
			<p>
				«Le dejé 50 € a Mikel el 3 de mayo.» Apúntalo aquí y no dependerá de la memoria de nadie
				— sobre todo de la tuya.
			</p>
		</section>
	{:else}
		{#if data.pendientes.length > 0}
			<section class="tarjeta lista aparece">
				{#each data.pendientes as p (p.id)}
					<div class="fila prestamo">
						<form method="POST" action="?/devuelto" use:enhance>
							<input type="hidden" name="id" value={p.id} />
							<button class="marcar" aria-label="Marcar devuelto"></button>
						</form>
						<a href="/entrada/{p.id}" class="cuerpo">
							<strong>{p.payload.persona}</strong> — {resumen(p.payload)}
							<small class="texto-suave">
								{fechaRelativa(new Date(String(p.payload.fecha ?? p.apuntadoEn) + (String(p.payload.fecha ?? '').length === 10 ? 'T12:00:00' : '')))}
								{#if p.payload.notas}· {p.payload.notas}{/if}
							</small>
						</a>
					</div>
				{/each}
			</section>
		{:else}
			<p class="texto-suave">Todo devuelto. Paz contable.</p>
		{/if}

		{#if data.devueltos.length > 0}
			<button class="alternar" onclick={() => (mostrarDevueltos = !mostrarDevueltos)}>
				{mostrarDevueltos ? 'Esconder' : 'Ver'} devueltos ({data.devueltos.length})
			</button>
			{#if mostrarDevueltos}
				<section class="tarjeta lista devueltos aparece">
					{#each data.devueltos as p (p.id)}
						<div class="fila prestamo">
							<form method="POST" action="?/devuelto" use:enhance>
								<input type="hidden" name="id" value={p.id} />
								<button class="marcar marcar--hecho" aria-label="Desmarcar devuelto">
									<Icono nombre="check" tamano={15} grosor={2.6} />
								</button>
							</form>
							<a href="/entrada/{p.id}" class="cuerpo tachado">
								<strong>{p.payload.persona}</strong> — {resumen(p.payload)}
							</a>
						</div>
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

	.resumen {
		margin-bottom: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.persona strong.positivo {
		color: var(--verde);
	}

	.persona strong.negativo {
		color: var(--peligro);
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

	.prestamo {
		min-height: 56px;
		border-bottom: 1px solid var(--linea);
	}

	.prestamo:last-child {
		border-bottom: none;
	}

	.marcar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2px solid var(--tinta-3);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.marcar:hover {
		border-color: var(--verde);
		background: var(--verde-suave);
	}

	.marcar--hecho {
		background: var(--verde);
		border-color: var(--verde);
		color: var(--verde-contraste);
	}

	.cuerpo {
		flex: 1;
		color: inherit;
		padding: 0.5rem 0;
	}

	.cuerpo small {
		display: block;
		font-size: 0.78rem;
	}

	.tachado {
		color: var(--tinta-3);
		text-decoration: line-through;
	}

	.alternar {
		margin: 1rem 0 0.5rem;
		color: var(--tinta-2);
		font-weight: 600;
		font-size: 0.9rem;
		min-height: 44px;
	}

	.devueltos {
		opacity: 0.85;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
	}
</style>
