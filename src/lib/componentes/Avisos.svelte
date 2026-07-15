<script lang="ts">
	import { avisos } from '$lib/cliente/avisos.svelte';
</script>

{#if avisos.length > 0}
	<div class="avisos" aria-live="polite">
		{#each avisos as aviso (aviso.id)}
			<div class="aviso aviso--{aviso.tono} aparece">{aviso.texto}</div>
		{/each}
	</div>
{/if}

<style>
	.avisos {
		position: fixed;
		bottom: calc(var(--barra-inferior) + 1rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: min(92vw, 420px);
		pointer-events: none;
	}

	.aviso {
		padding: 0.7rem 1rem;
		border-radius: var(--radio-s);
		background: var(--tinta);
		color: var(--fondo);
		font-weight: 600;
		font-size: 0.92rem;
		box-shadow: var(--sombra-alta);
		text-align: center;
	}

	.aviso--error {
		background: var(--peligro);
		color: #fff6ee;
	}

	.aviso--info {
		background: var(--verde);
		color: var(--verde-contraste);
	}
</style>
