<script lang="ts">
	import type { Campo, Payload } from '$lib/tipos';

	/**
	 * Campos de formulario generados desde la definición de un tipo.
	 * Los names coinciden con las claves del payload; el servidor los valida
	 * con validarPayload().
	 */
	let { campos, valores = {} }: { campos: Campo[]; valores?: Payload } = $props();

	function valorTexto(clave: string): string {
		const valor = valores[clave];
		if (valor === undefined || valor === null) return '';
		return String(valor);
	}

	function valorFecha(clave: string): string {
		const bruto = valorTexto(clave);
		if (!bruto) return '';
		// Acepta tanto YYYY-MM-DD como ISO completos.
		return bruto.slice(0, 10);
	}
</script>

{#each campos as campo (campo.clave)}
	<div class="grupo-campo">
		{#if campo.control === 'interruptor'}
			<label class="interruptor">
				<input
					type="checkbox"
					name={campo.clave}
					checked={valores[campo.clave] === true}
				/>
				<span>{campo.etiqueta}</span>
			</label>
		{:else}
			<label class="etiqueta" for="campo-{campo.clave}">
				{campo.etiqueta}{campo.requerido ? '' : ' (opcional)'}
			</label>
			{#if campo.control === 'textarea'}
				<textarea
					class="campo"
					id="campo-{campo.clave}"
					name={campo.clave}
					rows="3"
					required={campo.requerido}
					placeholder={campo.placeholder}
					value={valorTexto(campo.clave)}
				></textarea>
			{:else if campo.control === 'numero' || campo.control === 'moneda'}
				<input
					class="campo"
					id="campo-{campo.clave}"
					name={campo.clave}
					type="number"
					inputmode="decimal"
					step={campo.control === 'moneda' ? '0.01' : '1'}
					required={campo.requerido}
					placeholder={campo.placeholder}
					value={valorTexto(campo.clave)}
				/>
			{:else if campo.control === 'fecha'}
				<input
					class="campo"
					id="campo-{campo.clave}"
					name={campo.clave}
					type="date"
					required={campo.requerido}
					value={valorFecha(campo.clave)}
				/>
			{:else if campo.control === 'hora'}
				<input
					class="campo"
					id="campo-{campo.clave}"
					name={campo.clave}
					type="time"
					required={campo.requerido}
					value={valorTexto(campo.clave)}
				/>
			{:else if campo.control === 'escala5' || campo.control === 'escala10'}
				<select class="campo" id="campo-{campo.clave}" name={campo.clave} required={campo.requerido}>
					<option value="">—</option>
					{#each Array.from({ length: campo.control === 'escala5' ? 5 : 10 }, (_, i) => i + 1) as n (n)}
						<option value={n} selected={valores[campo.clave] === n}>{n}</option>
					{/each}
				</select>
			{:else if campo.control === 'opciones'}
				<select class="campo" id="campo-{campo.clave}" name={campo.clave} required={campo.requerido}>
					{#if !campo.requerido}
						<option value="">—</option>
					{/if}
					{#each campo.opciones ?? [] as opcion (opcion.valor)}
						<option value={opcion.valor} selected={valorTexto(campo.clave) === opcion.valor}>
							{opcion.texto}
						</option>
					{/each}
				</select>
			{:else if campo.control === 'url'}
				<input
					class="campo"
					id="campo-{campo.clave}"
					name={campo.clave}
					type="url"
					required={campo.requerido}
					placeholder={campo.placeholder ?? 'https://…'}
					value={valorTexto(campo.clave)}
				/>
			{:else}
				<input
					class="campo"
					id="campo-{campo.clave}"
					name={campo.clave}
					type="text"
					required={campo.requerido}
					placeholder={campo.placeholder}
					value={valorTexto(campo.clave)}
				/>
			{/if}
			{#if campo.ayuda}
				<p class="ayuda">{campo.ayuda}</p>
			{/if}
		{/if}
	</div>
{/each}

<style>
	.grupo-campo {
		margin-bottom: 0.9rem;
	}

	.interruptor {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 44px;
		font-weight: 600;
		color: var(--tinta-2);
		cursor: pointer;
	}

	.interruptor input {
		width: 22px;
		height: 22px;
		accent-color: var(--acento);
	}

	.ayuda {
		margin: 0.25rem 0 0 0.1rem;
		font-size: 0.8rem;
		color: var(--tinta-3);
	}
</style>
