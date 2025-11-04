import axios, { AxiosInstance } from 'axios';

function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n]/g, ' ');
}

function redactParams(params: Record<string, unknown>) {
  const clone: Record<string, unknown> = { ...params };
  if (clone.api_key) clone.api_key = '***';
  return clone;
}

function safeTmdbLog(...parts: string[]): void {
  const message = parts.join('');
  process.stdout.write(message + '\n');
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
    const typedParams = params as Record<string, unknown>;
    const sanitizedMethod = sanitizeForLog(method?.toUpperCase() ?? 'GET');
    const sanitizedUrl = sanitizeForLog(url ?? '');
    safeTmdbLog('🌐 TMDB ➡️  ', sanitizedMethod, ' ', sanitizedUrl, ' params=', JSON.stringify(redactParams(typedParams)));
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const start = (response.config as unknown as { __start?: number }).__start;
      const ms = start ? Date.now() - start : undefined;
      const sanitizedMethod = sanitizeForLog(response.config.method?.toUpperCase() ?? 'GET');
      const sanitizedUrl = sanitizeForLog(response.config.url ?? '');
      const timing = ms !== undefined ? ' ' + String(ms) + 'ms' : '';
      safeTmdbLog('🌐 TMDB ⬅️  ', sanitizedMethod, ' ', sanitizedUrl, ' ', String(response.status), timing);
      return response;
    },
    (error) => {
      const cfg = error.config ?? {};
      const start = (cfg as { __start?: number }).__start;
      const ms = start ? Date.now() - start : undefined;
      const sanitizedMethod = sanitizeForLog(String(cfg.method?.toUpperCase?.() ?? 'GET'));
      const sanitizedUrl = sanitizeForLog(String(cfg.url ?? ''));
      const sanitizedError = sanitizeForLog(String(error.message ?? ''));
      const timing = ms !== undefined ? ' ' + String(ms) + 'ms' : '';
      safeTmdbLog('🌐 TMDB ⬅️  ', sanitizedMethod, ' ', sanitizedUrl, ' ERROR', timing, ': ', sanitizedError);
      throw error;
    }
  );

  return client;
}

