import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

type TimedAxiosRequestConfig = InternalAxiosRequestConfig & {
  __start?: number;
};

function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n]/g, " ");
}

function redactParams(params: Record<string, unknown>) {
  const clone: Record<string, unknown> = { ...params };
  if (clone.api_key) clone.api_key = "***";
  return clone;
}

function safeTmdbLog(...parts: string[]): void {
  const message = parts.join("");
  process.stdout.write(message + "\n");
}

// Exported for testing
export function handleTmdbRequestIntercept(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
  const existingParams = (config.params ?? {}) as Record<string, unknown>;
  config.params = { ...existingParams, api_key: apiKey };

  (config as TimedAxiosRequestConfig).__start = Date.now();

  const sanitizedMethod = sanitizeForLog(
    typeof config.method === "string" ? config.method.toUpperCase() : "GET",
  );
  const sanitizedUrl = sanitizeForLog(
    typeof config.url === "string" ? config.url : "",
  );
  const paramsForLog = JSON.stringify(
    redactParams(config.params as Record<string, unknown>),
  );
  safeTmdbLog(
    "🌐 TMDB ➡️  ",
    sanitizedMethod,
    " ",
    sanitizedUrl,
    " params=",
    paramsForLog,
  );
  return config;
}

// Exported for testing
export function handleTmdbResponseSuccess(
  response: AxiosResponse,
): AxiosResponse {
  const start = (response.config as TimedAxiosRequestConfig).__start;
  const ms = typeof start === "number" ? Date.now() - start : undefined;
  const sanitizedMethod = sanitizeForLog(
    typeof response.config.method === "string"
      ? response.config.method.toUpperCase()
      : "GET",
  );
  const sanitizedUrl = sanitizeForLog(
    typeof response.config.url === "string" ? response.config.url : "",
  );
  const timing = ms !== undefined ? " " + String(ms) + "ms" : "";
  safeTmdbLog(
    "🌐 TMDB ⬅️  ",
    sanitizedMethod,
    " ",
    sanitizedUrl,
    " ",
    String(response.status),
    timing,
  );
  return response;
}

// Exported for testing
export function handleTmdbResponseError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const cfg = (error.config ?? {}) as TimedAxiosRequestConfig;
    const start = cfg.__start;
    const ms = typeof start === "number" ? Date.now() - start : undefined;
    const sanitizedMethod = sanitizeForLog(
      typeof cfg.method === "string" ? cfg.method.toUpperCase() : "GET",
    );
    const sanitizedUrl = sanitizeForLog(
      typeof cfg.url === "string" ? cfg.url : "",
    );
    const sanitizedError = sanitizeForLog(error.message);
    const timing = ms !== undefined ? " " + String(ms) + "ms" : "";
    safeTmdbLog(
      "🌐 TMDB ⬅️  ",
      sanitizedMethod,
      " ",
      sanitizedUrl,
      " ERROR",
      timing,
      ": ",
      sanitizedError,
    );
    throw error;
  }

  const fallbackMessage = sanitizeForLog(
    error instanceof Error
      ? error.message
      : String(error ?? "Unknown TMDB error"),
  );
  safeTmdbLog("🌐 TMDB ⬅️  UNKNOWN ERROR: ", fallbackMessage);
  throw error instanceof Error ? error : new Error(fallbackMessage);
}

// Singleton instance - created once at startup
let tmdbClientInstance: AxiosInstance | null = null;

export function getTmdbClient(): AxiosInstance {
  if (!tmdbClientInstance) {
    tmdbClientInstance = axios.create({
      baseURL: "https://api.themoviedb.org/3",
      timeout: 15_000,
    });

    tmdbClientInstance.interceptors.request.use(handleTmdbRequestIntercept);
    tmdbClientInstance.interceptors.response.use(
      handleTmdbResponseSuccess,
      handleTmdbResponseError,
    );
  }

  return tmdbClientInstance;
}

// Reset client for testing purposes
export function resetTmdbClient(): void {
  tmdbClientInstance = null;
}
