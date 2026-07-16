<script lang="ts">
	import { enhance } from '$app/forms';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Icono from '$lib/componentes/Icono.svelte';
	import { diaLocal, fechaCorta } from '$lib/fechas';

	let { data, form } = $props();

	type Pestana = 'pendientes' | 'vistas' | 'ranking' | 'estadisticas';
	const CLAVES_PESTANA = ['pendientes', 'vistas', 'ranking', 'estadisticas'];
	const pestanaInicial = page.url.searchParams.get('p') ?? '';
	let pestana = $state<Pestana>(
		CLAVES_PESTANA.includes(pestanaInicial) ? (pestanaInicial as Pestana) : 'pendientes'
	);
	let mostrarAlta = $state(false);
	let estadoAlta = $state<'pendiente' | 'vista'>('pendiente');
	let puntuando = $state<string | null>(null);

	const PESTANAS: { clave: Pestana; texto: string }[] = [
		{ clave: 'pendientes', texto: 'Pendientes' },
		{ clave: 'vistas', texto: 'Vistas' },
		{ clave: 'ranking', texto: 'Ranking' },
		{ clave: 'estadisticas', texto: 'Estadísticas' }
	];

	// La pestaña vive en la URL: recargar o volver atrás no te devuelve a «Pendientes».
	function cambiarPestana(p: Pestana) {
		pestana = p;
		replaceState(`?p=${p}`, {});
	}

	function conmutarAlta() {
		if (!mostrarAlta) estadoAlta = pestana === 'vistas' ? 'vista' : 'pendiente';
		mostrarAlta = !mostrarAlta;
	}

	function titulo(p: Record<string, unknown>): string {
		return String(p.titulo ?? '');
	}
</script>

<svelte:head>
	<title>BIZIYE — cine y series</title>
</svelte:head>

<main class="pagina">
	<header class="cabecera">
		<a href="/apartados" class="fila volver" aria-label="Volver a apartados">
			<Icono nombre="flecha-izquierda" tamano={20} grosor={2} />
		</a>
		<h1 class="titulo-pagina">Cine y series</h1>
	</header>

	<nav class="fila pestanas" aria-label="Secciones de cine">
		{#each PESTANAS as p (p.clave)}
			<button
				class="chip"
				class:chip--activo={pestana === p.clave}
				onclick={() => cambiarPestana(p.clave)}
			>
				{p.texto}
			</button>
		{/each}
	</nav>

	{#if pestana === 'pendientes' || pestana === 'vistas'}
		<button class="boton boton--suave alta-conmutador" onclick={conmutarAlta}>
			<Icono nombre="mas" tamano={16} grosor={2.2} />
			{mostrarAlta ? 'Cerrar' : pestana === 'vistas' ? 'Apuntar una vista' : 'Apuntar título'}
		</button>

		{#if mostrarAlta}
			<form
				method="POST"
				action="?/crear"
				class="tarjeta formulario aparece"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success') {
							mostrarAlta = false;
							// Si entró directa como vista, enséñala donde ha caído.
							if (estadoAlta === 'vista' && pestana !== 'vistas') cambiarPestana('vistas');
						}
					};
				}}
			>
				<label class="etiqueta" for="c-titulo">Título</label>
				<input class="campo" id="c-titulo" name="titulo" required placeholder="Dune, The Wire…" />

				<span class="etiqueta">Estado</span>
				<input type="hidden" name="estado" value={estadoAlta} />
				<div class="fila conmutador-estado" role="group" aria-label="Estado del título">
					<button
						type="button"
						class="chip"
						class:chip--activo={estadoAlta === 'pendiente'}
						onclick={() => (estadoAlta = 'pendiente')}
					>
						Pendiente
					</button>
					<button
						type="button"
						class="chip"
						class:chip--activo={estadoAlta === 'vista'}
						onclick={() => (estadoAlta = 'vista')}
					>
						Ya la vi
					</button>
				</div>

				{#if estadoAlta === 'vista'}
					<div class="fila fila-campos">
						<div>
							<label class="etiqueta" for="c-nota">Tu nota (1-10)</label>
							<input
								class="campo"
								id="c-nota"
								name="nota"
								type="number"
								inputmode="numeric"
								min="1"
								max="10"
								required
								placeholder="8"
							/>
						</div>
						<div>
							<label class="etiqueta" for="c-vista-en">Vista el…</label>
							<input class="campo" id="c-vista-en" name="vista_en" type="date" value={diaLocal()} />
						</div>
					</div>
				{/if}

				<div class="fila fila-campos">
					<div>
						<label class="etiqueta" for="c-formato">Formato</label>
						<select class="campo" id="c-formato" name="formato">
							<option value="pelicula">Película</option>
							<option value="serie">Serie</option>
						</select>
					</div>
					<div>
						<label class="etiqueta" for="c-recomendador">Quién la recomendó</label>
						<input class="campo" id="c-recomendador" name="recomendador" placeholder="Ana" />
					</div>
				</div>

				<div class="fila fila-campos">
					<div>
						<label class="etiqueta" for="c-genero">Género</label>
						<input class="campo" id="c-genero" name="genero" placeholder="Thriller…" />
					</div>
					<div>
						<label class="etiqueta" for="c-anio">Año</label>
						<input class="campo" id="c-anio" name="anio" type="number" inputmode="numeric" placeholder="2024" />
					</div>
				</div>

				{#if form?.error && !form?.id}
					<p class="error" role="alert">{form.error}</p>
				{/if}
				<button class="boton boton--primario">
					{estadoAlta === 'vista' ? 'A vistas, con nota' : 'A la lista'}
				</button>
			</form>
		{/if}
	{/if}

	{#if pestana === 'pendientes'}
		{#if data.pendientes.length === 0}
			<section class="tarjeta estado-vacio aparece">
				<div class="estado-vacio__icono" aria-hidden="true">🎬</div>
				<h3>Nada pendiente</h3>
				<p>
					Apunta cada peli o serie que te recomienden (y quién). Luego pregunta en el chat:
					«¿qué veo esta noche?».
				</p>
			</section>
		{:else}
			<section class="tarjeta lista aparece">
				{#each data.pendientes as t (t.id)}
					<div class="titulo-fila">
						<a href="/entrada/{t.id}" class="cuerpo">
							<strong>{titulo(t.payload)}</strong>
							<small class="texto-suave">
								{t.payload.formato === 'serie' ? 'serie' : 'película'}
								{#if t.payload.recomendador}· recomendada por {t.payload.recomendador}{/if}
							</small>
						</a>
						{#if puntuando === t.id}
							<form method="POST" action="?/vista" class="fila puntuar" use:enhance={() => {
								return async ({ update, result }) => {
									await update();
									if (result.type === 'success') puntuando = null;
								};
							}}>
								<input type="hidden" name="id" value={t.id} />
								<input
									class="campo campo-nota"
									name="nota"
									type="number"
									min="1"
									max="10"
									required
									placeholder="1-10"
									aria-label="Tu nota del 1 al 10"
								/>
								<button class="boton boton--primario boton--compacto">Vista</button>
							</form>
						{:else}
							<button class="chip" onclick={() => (puntuando = t.id)}>Ya la vi</button>
						{/if}
					</div>
					{#if form?.id === t.id && form?.error}
						<p class="error" role="alert">{form.error}</p>
					{/if}
				{/each}
			</section>
		{/if}
	{:else if pestana === 'vistas'}
		{#if data.vistas.length === 0}
			<section class="tarjeta estado-vacio aparece">
				<div class="estado-vacio__icono" aria-hidden="true">👀</div>
				<h3>Todavía nada visto</h3>
				<p>
					Puntúa desde «Pendientes» lo que termines, o apunta aquí directamente algo que ya
					viste, con su nota del 1 al 10.
				</p>
			</section>
		{:else}
			<section class="tarjeta lista aparece">
				{#each data.vistas as t (t.id)}
					<a href="/entrada/{t.id}" class="titulo-fila enlace-fila">
						<span class="cuerpo">
							<strong>{titulo(t.payload)}</strong>
							<small class="texto-suave">
								{#if t.payload.vista_en}{fechaCorta(new Date(`${t.payload.vista_en}T12:00:00`))}{/if}
								{#if t.payload.genero}· {t.payload.genero}{/if}
							</small>
						</span>
						{#if t.payload.nota}
							<span class="nota">{t.payload.nota}<small>/10</small></span>
						{/if}
					</a>
				{/each}
			</section>
		{/if}
	{:else if pestana === 'ranking'}
		{#if data.ranking.length === 0}
			<section class="tarjeta estado-vacio aparece">
				<div class="estado-vacio__icono" aria-hidden="true">🏆</div>
				<h3>Ranking vacío</h3>
				<p>El podio se construye puntuando lo que ves. Nota del 1 al 10, sin piedad.</p>
			</section>
		{:else}
			<section class="tarjeta lista aparece">
				{#each data.ranking as t, i (t.id)}
					<a href="/entrada/{t.id}" class="titulo-fila enlace-fila">
						<span class="cuerpo fila-ranking">
							<span class="puesto" class:podio={i < 3}>{i + 1}</span>
							<span>
								<strong>{titulo(t.payload)}</strong>
								{#if t.payload.recomendador}
									<small class="texto-suave">de parte de {t.payload.recomendador}</small>
								{/if}
							</span>
						</span>
						<span class="nota">{t.payload.nota}<small>/10</small></span>
					</a>
				{/each}
			</section>
		{/if}
	{:else}
		{#if data.vistas.length === 0}
			<section class="tarjeta estado-vacio aparece">
				<div class="estado-vacio__icono" aria-hidden="true">📊</div>
				<h3>Sin datos aún</h3>
				<p>Las estadísticas por género, año y recomendador aparecen al puntuar lo visto.</p>
			</section>
		{:else}
			<section class="tarjeta resumen-stats aparece">
				<div class="dato">
					<span class="cifra">{data.vistas.length}</span>
					<span class="texto-suave texto-pequeno">{data.vistas.length === 1 ? 'título visto' : 'títulos vistos'}</span>
				</div>
				{#if data.notaMedia !== null}
					<div class="dato">
						<span class="cifra">{data.notaMedia.toFixed(1)}</span>
						<span class="texto-suave texto-pequeno">nota media</span>
					</div>
				{/if}
				<div class="dato">
					<span class="cifra">{data.pendientes.length}</span>
					<span class="texto-suave texto-pequeno">en la lista</span>
				</div>
			</section>

			{#if data.recomendadores.length > 0}
				<h2 class="etiqueta seccion">Recomendadores</h2>
				<section class="tarjeta lista aparece">
					{#each data.recomendadores as r (r.clave)}
						<div class="fila fila--separada grupo">
							<span>
								<strong>{r.clave}</strong>
								<small class="texto-suave">
									{r.vistas} {r.vistas === 1 ? 'vista' : 'vistas'}
									{#if r.pendientes > 0}· {r.pendientes} pendiente{r.pendientes === 1 ? '' : 's'}{/if}
								</small>
							</span>
							<span class="nota">{r.notaMedia !== null ? r.notaMedia.toFixed(1) : '—'}</span>
						</div>
					{/each}
				</section>
			{/if}

			{#if data.porGenero.length > 0}
				<h2 class="etiqueta seccion">Por género</h2>
				<section class="tarjeta lista aparece">
					{#each data.porGenero as g (g.clave)}
						<div class="fila fila--separada grupo">
							<span>
								<strong>{g.clave}</strong>
								<small class="texto-suave">{g.vistas} {g.vistas === 1 ? 'vista' : 'vistas'}</small>
							</span>
							<span class="nota">{g.notaMedia !== null ? g.notaMedia.toFixed(1) : '—'}</span>
						</div>
					{/each}
				</section>
			{/if}

			{#if data.porAnio.length > 0}
				<h2 class="etiqueta seccion">Por año</h2>
				<section class="tarjeta lista aparece">
					{#each data.porAnio as a (a.clave)}
						<div class="fila fila--separada grupo">
							<span>
								<strong>{a.clave}</strong>
								<small class="texto-suave">{a.vistas} {a.vistas === 1 ? 'vista' : 'vistas'}</small>
							</span>
							<span class="nota">{a.notaMedia !== null ? a.notaMedia.toFixed(1) : '—'}</span>
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

	.pestanas {
		flex-wrap: wrap;
		margin-bottom: 0.9rem;
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

	.conmutador-estado {
		gap: 0.4rem;
		margin-bottom: 0.75rem;
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

	.titulo-fila {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		min-height: 56px;
		border-bottom: 1px solid var(--linea);
		padding: 0.45rem 0;
	}

	.titulo-fila:last-child {
		border-bottom: none;
	}

	.enlace-fila {
		color: inherit;
	}

	.cuerpo {
		flex: 1;
		color: inherit;
		min-width: 0;
	}

	.cuerpo small {
		display: block;
		font-size: 0.78rem;
	}

	.puntuar {
		gap: 0.4rem;
	}

	.campo-nota {
		width: 4.5rem;
		margin: 0;
		min-height: 40px;
		padding: 0.35rem 0.5rem;
	}

	.boton--compacto {
		min-height: 40px;
		padding: 0.4rem 0.8rem;
		font-size: 0.88rem;
	}

	.nota {
		font-family: var(--fuente-display);
		font-weight: 800;
		font-size: 1.1rem;
		white-space: nowrap;
	}

	.nota small {
		font-weight: 400;
		color: var(--tinta-3);
		font-size: 0.72rem;
	}

	.fila-ranking {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.puesto {
		width: 1.8rem;
		text-align: center;
		font-family: var(--fuente-display);
		font-weight: 800;
		color: var(--tinta-3);
		flex-shrink: 0;
	}

	.puesto.podio {
		color: var(--aviso);
	}

	.resumen-stats {
		display: flex;
		justify-content: space-around;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.dato {
		text-align: center;
	}

	.cifra {
		display: block;
		font-family: var(--fuente-display);
		font-size: 1.6rem;
		font-weight: 800;
	}

	.seccion {
		margin: 0.9rem 0 0.4rem;
	}

	.grupo {
		min-height: 48px;
		border-bottom: 1px solid var(--linea);
	}

	.grupo:last-child {
		border-bottom: none;
	}

	.grupo small {
		display: block;
		font-size: 0.78rem;
	}

	.error {
		color: var(--peligro);
		font-size: 0.88rem;
		font-weight: 600;
		margin: 0.2rem 0;
	}
</style>
