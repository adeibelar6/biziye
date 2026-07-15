<script lang="ts" module>
	/** Iconos de trazo propios de BIZIYE (24×24, trazo 1.8, puntas redondas). */
	const RUTAS: Record<string, string> = {
		sol: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M19.1 4.9l-1.4 1.4 M6.3 17.7l-1.4 1.4',
		luna: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z',
		lista: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
		mas: 'M12 5v14 M5 12h14',
		chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3.5l1.8-3.4A8.5 8.5 0 1 1 21 11.5z',
		rejilla: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
		mic: 'M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4',
		buscar: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M21 21l-4.3-4.3',
		ajustes: 'M4 6h16 M4 12h16 M4 18h16 M9 4v4 M15 10v4 M7 16v4',
		'flecha-derecha': 'M5 12h14 M13 6l6 6-6 6',
		'flecha-izquierda': 'M19 12H5 M11 6l-6 6 6 6',
		cruz: 'M6 6l12 12 M18 6L6 18',
		check: 'M4 12.5l5 5L20 6.5',
		campana: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z M10.3 20a2 2 0 0 0 3.4 0',
		ojo: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
		'ojo-tachado':
			'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z M4 4l16 16',
		lapiz: 'M17 3l4 4L8 20l-5 1 1-5z',
		papelera: 'M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13 M10 11v5 M14 11v5',
		cine: 'M3 5h18v14H3z M3 9h18 M7.5 5v4 M12 5v4 M16.5 5v4',
		dinero: 'M3 7h18v10H3z M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z M6.5 12h.01 M17.5 12h.01',
		corazon: 'M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z',
		calendario: 'M4 6h16v15H4z M4 10.5h16 M8 3v5 M16 3v5',
		reloj: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3 2',
		descarga: 'M12 3v12 M7 10l5 5 5-5 M4 21h16',
		chispa: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9z',
		candado: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2.5',
		inbox: 'M5 4h14l3 8v8H2v-8z M2 12h6l2 3h4l2-3h6',
		libro: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
		risa: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M8 13.5s1.3 3 4 3 4-3 4-3 M9 9.5h.01 M15 9.5h.01',
		rayo: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
		trofeo: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M7 5H3.5S3.5 10 7 10 M17 5h3.5S20.5 10 17 10',
		nota: 'M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h4',
		bandera: 'M5 21V4 M5 4h12l-2 4 2 4H5',
		repetir: 'M3 12a9 9 0 0 1 15.3-6.4L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15.3 6.4L3 16 M3 21v-5h5',
		intercambio: 'M4 7h13 M13 3l4 4-4 4 M20 17H7 M11 13l-4 4 4 4',
		regalo: 'M3 8h18v4H3z M5 12h14v9H5z M12 8v13 M12 8s-4.5 0-4.5-3A2.2 2.2 0 0 1 12 5 M12 8s4.5 0 4.5-3A2.2 2.2 0 0 0 12 5',
		salir: 'M9 21H4V3h5 M16 17l5-5-5-5 M21 12H9',
		usuario: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M4 21a8 8 0 0 1 16 0',
		enviar: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
		pildora: 'M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z M7 7l10 10'
	};
</script>

<script lang="ts">
	let {
		nombre,
		tamano = 24,
		grosor = 1.8
	}: { nombre: string; tamano?: number; grosor?: number } = $props();
</script>

<svg
	width={tamano}
	height={tamano}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={grosor}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={RUTAS[nombre] ?? RUTAS.nota} />
</svg>
