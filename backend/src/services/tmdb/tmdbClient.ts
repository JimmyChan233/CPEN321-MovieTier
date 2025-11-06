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

// Exported for testing
export function handleTmdbRequestIntercept(config: any) {
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
}

// Exported for testing
export function handleTmdbResponseSuccess(response: any) {
  const start = (response.config as unknown as { __start?: number }).__start;
  const ms = start ? Date.now() - start : undefined;
  const sanitizedMethod = sanitizeForLog(response.config.method?.toUpperCase() ?? 'GET');
  const sanitizedUrl = sanitizeForLog(response.config.url ?? '');
  const timing = ms !== undefined ? ' ' + String(ms) + 'ms' : '';
  safeTmdbLog('🌐 TMDB ⬅️  ', sanitizedMethod, ' ', sanitizedUrl, ' ', String(response.status), timing);
  return response;
}

// Exported for testing
export function handleTmdbResponseError(error: any): never {
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

// Singleton instance - created once at startup
let tmdbClientInstance: AxiosInstance | null = null;

export function getTmdbClient(): AxiosInstance {
  if (!tmdbClientInstance) {
    tmdbClientInstance = axios.create({
      baseURL: 'https://api.themoviedb.org/3',
      timeout: 15_000
    });

    tmdbClientInstance.interceptors.request.use(handleTmdbRequestIntercept);
    tmdbClientInstance.interceptors.response.use(handleTmdbResponseSuccess, handleTmdbResponseError);
  }

  return tmdbClientInstance;
}

// Reset client for testing purposes
export function resetTmdbClient(): void {
  tmdbClientInstance = null;
}

