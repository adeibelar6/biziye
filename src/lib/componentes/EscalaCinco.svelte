<script lang="ts">
	let {
		valor = undefined,
		etiqueta,
		alElegir
	}: {
		valor?: number;
		etiqueta: string;
		alElegir: (valor: number) => void;
	} = $props();
</script>

<div class="escala" role="radiogroup" aria-label={etiqueta}>
	{#each [1, 2, 3, 4, 5] as punto (punto)}
		<button
			type="button"
			role="radio"
			aria-checked={valor === punto}
			aria-label="{etiqueta}: {punto} de 5"
			class="punto"
			class:punto--activo={valor !== undefined && punto <= valor}
			class:punto--elegido={valor === punto}
			onclick={() => alElegir(punto)}
		>
			{punto}
		</button>
	{/each}
</div>

<style>
	.escala {
		display: flex;
		gap: 0.4rem;
	}

	.punto {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: var(--superficie-2);
		color: var(--tinta-3);
		font-weight: 700;
		font-family: var(--fuente-display);
		font-size: 1rem;
		transition:
			background-color 120ms ease,
			color 120ms ease,
			transform 120ms ease;
	}

	.punto:active {
		transform: scale(0.92);
	}

	.punto--activo {
		background: var(--verde-suave);
		color: var(--verde);
	}

	.punto--elegido {
		background: var(--verde);
		color: var(--verde-contraste);
	}
</style>
