import axios, { AxiosInstance } from 'axios';

function redactParams(params: Record<string, unknown> | undefined) {
  if (!params) return params;
  const clone: Record<string, unknown> = { ...params };
  if (clone.api_key) clone.api_key = '***';
  return clone;
}

export function getTmdbClient(): AxiosInstance {
  const client = axios.create({
    baseURL: 'https://api.themoviedb.org/3',
    timeout: 15_000
  });

  client.interceptors.request.use((config) => {
    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    config.params = { ...(config.params ?? {}), api_key: apiKey };
    const start = Date.now();
    (config as unknown as { __start: number }).__start = start;
    const { method, url, params } = config;
    // eslint-disable-next-line no-console
    console.log(`🌐 TMDB ➡️  ${method?.toUpperCase()} ${url} params=${JSON.stringify(redactParams(params))}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const start = (response.config as unknown as { __start?: number }).__start;
      const ms = start ? Date.now() - start : undefined;
      // eslint-disable-next-line no-console
      console.log(`🌐 TMDB ⬅️  ${response.config.method?.toUpperCase()} ${response.config.url} ${response.status}${ms !== undefined ? ` ${ms}ms` : ''}`);
      return response;
    },
    (error) => {
      const cfg = error.config ?? {};
      const start = (cfg as { __start?: number }).__start;
      const ms = start ? Date.now() - start : undefined;
      // eslint-disable-next-line no-console
      console.log(`🌐 TMDB ⬅️  ${cfg.method?.toUpperCase?.() ?? 'GET'} ${cfg.url} ERROR${ms !== undefined ? ` ${ms}ms` : ''}: ${error.message}`);
      throw error;
    }
  );

  return client;
}

