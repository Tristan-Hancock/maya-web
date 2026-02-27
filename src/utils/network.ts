export class RequestTimeoutError extends Error {
  constructor(message = "request_timeout") {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

export function isRequestTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as { name?: string; message?: string };
  return candidate.name === "RequestTimeoutError" || candidate.name === "AbortError" || candidate.message === "request_timeout";
}

export function isNetworkConnectivityError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as { message?: string };
  const msg = String(candidate.message || "").toLowerCase();
  return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed");
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { signal: _ignoredSignal, ...rest } = init;
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (isRequestTimeoutError(err)) {
      throw new RequestTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
