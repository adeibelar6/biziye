/** Stub de $env/dynamic/private para vitest: lee de process.env. */
export const env: Record<string, string | undefined> = new Proxy(
	{},
	{
		get: (_objetivo, clave) =>
			typeof clave === 'string' ? process.env[clave] : undefined
	}
);
