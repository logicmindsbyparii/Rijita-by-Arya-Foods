/**
 * Absolute API base for code running on the server (server components, route
 * handlers, sitemap). Relative "/api" only resolves in the browser, where the
 * Next.js rewrite proxies it; on the server there is no origin to resolve it
 * against, so fall back to API_ORIGIN — the same var next.config.js points the
 * rewrite at.
 */
export const getServerApiBase = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) return envUrl.replace(/\/$/, "");
  const origin = (process.env.API_ORIGIN || "http://localhost:5001").replace(/\/$/, "");
  return `${origin}/api`;
};

/**
 * Server-side JSON fetch with a hard deadline. Returns null on timeout, network
 * error or non-2xx so callers degrade to their static content instead of
 * throwing.
 *
 * Two independent layers, because either one alone has failed here:
 *  - AbortController cancels the request and releases the socket.
 *  - Promise.race guarantees the *caller* resolves even if the abort is not
 *    honoured. Next.js patches global fetch and does not reliably forward
 *    `signal` through its cache layer, so a bare AbortSignal.timeout() can be
 *    silently dropped. A fetch that hangs during the build's static-generation
 *    pass gets the worker SIGTERMed after 60s and fails the whole deploy.
 *
 * The request promise is caught eagerly and can never reject: once it loses the
 * race nothing is awaiting it, and an unhandled rejection also aborts the build.
 */
export async function fetchServerJson<T = any>(url: string, timeoutMs = 5000): Promise<T | null> {
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

  const request = fetch(url, { cache: "no-store", signal: controller.signal })
    .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
    .catch(() => null);

  const deadline = new Promise<null>((resolve) => {
    deadlineTimer = setTimeout(() => resolve(null), timeoutMs + 500);
  });

  try {
    return await Promise.race([request, deadline]);
  } finally {
    clearTimeout(abortTimer);
    clearTimeout(deadlineTimer);
  }
}

export const getApiBase = () => {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!envUrl || envUrl.includes("localhost:5001") || envUrl.includes("127.0.0.1:5001")) {
      return "/api";
    }
    return envUrl;
  }
  return getServerApiBase();
};

export const API_BASE = getApiBase();

export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

export async function parseResponseBody(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

export function extractErrorMessage(data: any, status: number): string {
  if (typeof data?.message === "string" && data.message) return data.message;
  const detail = data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d: any) => (typeof d?.msg === "string" ? d.msg : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join(", ");
  }
  if (status === 0) return "Unable to reach the server. Please check your connection.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "Request failed. Please try again.";
}
