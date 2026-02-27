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
