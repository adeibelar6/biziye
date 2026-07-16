import { definicion, type Payload } from './index';

/**
 * Normaliza y valida un payload según la definición de su tipo.
 * Convierte números/booleanos que llegan como texto de formularios,
 * exige los campos requeridos y deja pasar claves extra (el payload es libre).
 */
export function validarPayload(
	tipo: string,
	bruto: Payload
): { valido: true; payload: Payload } | { valido: false; error: string } {
	const def = definicion(tipo);
	const payload: Payload = { ...bruto };

	for (const campo of def.campos) {
		let valor = payload[campo.clave];

		if (valor === '' || valor === undefined || valor === null) {
			delete payload[campo.clave];
			if (campo.requerido) {
				return { valido: false, error: `Falta «${campo.etiqueta}».` };
			}
			continue;
		}

		switch (campo.control) {
			case 'numero':
			case 'moneda': {
				const numero =
					typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
				if (!Number.isFinite(numero)) {
					return { valido: false, error: `«${campo.etiqueta}» no es un número válido.` };
				}
				payload[campo.clave] = campo.control === 'moneda' ? Math.round(numero * 100) / 100 : numero;
				break;
			}
			case 'escala5':
			case 'escala10': {
				const tope = campo.control === 'escala5' ? 5 : 10;
				const numero = Math.round(Number(valor));
				if (!Number.isFinite(numero) || numero < 1 || numero > tope) {
					return { valido: false, error: `«${campo.etiqueta}» debe estar entre 1 y ${tope}.` };
				}
				payload[campo.clave] = numero;
				break;
			}
			case 'interruptor': {
				payload[campo.clave] = valor === true || valor === 'true' || valor === 'on' || valor === '1';
				break;
			}
			case 'fecha': {
				const fecha = new Date(String(valor));
				if (Number.isNaN(fecha.getTime())) {
					return { valido: false, error: `«${campo.etiqueta}» no es una fecha válida.` };
				}
				payload[campo.clave] = String(valor);
				break;
			}
			case 'hora': {
				const coincidencia = String(valor).trim().match(/^(\d{1,2})(?:[:.h]([0-5]\d))?\s*h?$/i);
				const horas = coincidencia ? Number(coincidencia[1]) : NaN;
				if (!coincidencia || horas > 23) {
					return { valido: false, error: `«${campo.etiqueta}» no es una hora válida (HH:MM).` };
				}
				payload[campo.clave] = `${String(horas).padStart(2, '0')}:${coincidencia[2] ?? '00'}`;
				break;
			}
			case 'opciones': {
				const valido = campo.opciones?.some((o) => o.valor === String(valor));
				if (!valido) {
					return { valido: false, error: `«${campo.etiqueta}» tiene un valor desconocido.` };
				}
				payload[campo.clave] = String(valor);
				break;
			}
			default: {
				payload[campo.clave] = String(valor);
			}
		}
	}

	return { valido: true, payload };
}
