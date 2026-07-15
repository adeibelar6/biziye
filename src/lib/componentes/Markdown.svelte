<script lang="ts">
	/**
	 * Renderizador mínimo del markdown que genera la IA (títulos, listas,
	 * negrita). Sin dependencias: escapa el HTML y solo reconoce lo que
	 * nuestros generadores producen.
	 */
	let { texto }: { texto: string } = $props();

	function escapar(linea: string): string {
		return linea.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function enriquecer(linea: string): string {
		return escapar(linea).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	}

	type Bloque =
		| { clase: 'titulo'; nivel: number; html: string }
		| { clase: 'lista'; items: string[] }
		| { clase: 'parrafo'; html: string };

	const bloques = $derived.by(() => {
		const resultado: Bloque[] = [];
		for (const cruda of texto.split('\n')) {
			const linea = cruda.trimEnd();
			if (!linea.trim()) continue;
			const titulo = linea.match(/^(#{1,4})\s+(.*)/);
			if (titulo) {
				resultado.push({
					clase: 'titulo',
					nivel: titulo[1].length,
					html: enriquecer(titulo[2])
				});
				continue;
			}
			const item = linea.match(/^[-*]\s+(.*)/);
			if (item) {
				const anterior = resultado[resultado.length - 1];
				if (anterior?.clase === 'lista') anterior.items.push(enriquecer(item[1]));
				else resultado.push({ clase: 'lista', items: [enriquecer(item[1])] });
				continue;
			}
			resultado.push({ clase: 'parrafo', html: enriquecer(linea) });
		}
		return resultado;
	});
</script>

<div class="markdown">
	{#each bloques as bloque, i (i)}
		{#if bloque.clase === 'titulo'}
			{#if bloque.nivel <= 1}
				<h2>{@html bloque.html}</h2>
			{:else if bloque.nivel === 2}
				<h3>{@html bloque.html}</h3>
			{:else}
				<h4>{@html bloque.html}</h4>
			{/if}
		{:else if bloque.clase === 'lista'}
			<ul>
				{#each bloque.items as item, j (j)}
					<li>{@html item}</li>
				{/each}
			</ul>
		{:else}
			<p>{@html bloque.html}</p>
		{/if}
	{/each}
</div>

<style>
	.markdown {
		font-size: 0.95rem;
		line-height: 1.55;
	}

	.markdown h2 {
		font-family: var(--fuente-display);
		font-size: 1.25rem;
		font-weight: 800;
		margin: 0.9rem 0 0.4rem;
	}

	.markdown h2:first-child {
		margin-top: 0;
	}

	.markdown h3 {
		font-family: var(--fuente-display);
		font-size: 1.05rem;
		font-weight: 700;
		margin: 0.8rem 0 0.3rem;
	}

	.markdown h4 {
		font-size: 0.95rem;
		font-weight: 700;
		margin: 0.7rem 0 0.25rem;
	}

	.markdown p {
		margin: 0.35rem 0;
	}

	.markdown ul {
		margin: 0.35rem 0;
		padding-left: 1.2rem;
	}

	.markdown li {
		margin: 0.2rem 0;
	}
</style>
