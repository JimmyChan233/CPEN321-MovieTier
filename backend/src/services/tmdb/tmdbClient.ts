import axios, { AxiosInstance } from 'axios';

function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n]/g, ' ');
}

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
    const typedParams = params as Record<string, unknown> | undefined;
    const sanitizedMethod = sanitizeForLog(method?.toUpperCase() ?? 'GET');
    const sanitizedUrl = sanitizeForLog(url ?? '');
    // eslint-disable-next-line no-console, security/detect-non-literal-fs-filename
    console.log(`🌐 TMDB ➡️  ${sanitizedMethod} ${sanitizedUrl} params=${JSON.stringify(redactParams(typedParams))}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const start = (response.config as unknown as { __start?: number }).__start;
      const ms = start ? Date.now() - start : undefined;
      const sanitizedMethod = sanitizeForLog(response.config.method?.toUpperCase() ?? 'GET');
      const sanitizedUrl = sanitizeForLog(response.config.url ?? '');
      // eslint-disable-next-line no-console, security/detect-non-literal-fs-filename
      console.log(`🌐 TMDB ⬅️  ${sanitizedMethod} ${sanitizedUrl} ${response.status}${ms !== undefined ? ` ${ms}ms` : ''}`);
      return response;
    },
    (error) => {
      const cfg = error.config ?? {};
      const start = (cfg as { __start?: number }).__start;
      const ms = start ? Date.now() - start : undefined;
      const sanitizedMethod = sanitizeForLog(cfg.method?.toUpperCase?.() ?? 'GET');
      const sanitizedUrl = sanitizeForLog(cfg.url ?? '');
      const sanitizedError = sanitizeForLog(error.message ?? '');
      // eslint-disable-next-line no-console, security/detect-non-literal-fs-filename
      console.log(`🌐 TMDB ⬅️  ${sanitizedMethod} ${sanitizedUrl} ERROR${ms !== undefined ? ` ${ms}ms` : ''}: ${sanitizedError}`);
      throw error;
    }
  );

  return client;
}

