const AUTH_LOST_EVENT = "maya_auth_lost";

export function notifyAuthLost(reason?: string) {
  try {
    window.dispatchEvent(new CustomEvent(AUTH_LOST_EVENT, { detail: { reason } }));
  } catch {
    // ignore dispatch failures
  }
}

export function onAuthLost(handler: (event: Event) => void) {
  window.addEventListener(AUTH_LOST_EVENT, handler);
  return () => window.removeEventListener(AUTH_LOST_EVENT, handler);
}

export function isAuthStatus(status: unknown): boolean {
  return status === 401 || status === 403;
}

export function isLikelyAuthError(err: unknown): boolean {
  if (!err) return false;

  const candidate = err as {
    message?: string;
    name?: string;
    reason?: string;
    kind?: string;
    error?: string;
    status?: unknown;
  };
  const message = String(candidate.message || "").toLowerCase();
  const name = String(candidate.name || "").toLowerCase();
  const reason = String(candidate.reason || candidate.kind || candidate.error || "").toLowerCase();
  const hasAuthPhrase = (value: string) =>
    value.includes("unauthorized") ||
    value.includes("forbidden") ||
    value.includes("not authenticated") ||
    value.includes("no current user") ||
    value.includes("user needs to be authenticated") ||
    value.includes("missing_token") ||
    value.includes("missing_sub") ||
    value.includes("token expired") ||
    value.includes("expired token") ||
    value.includes("invalid token") ||
    value.includes("invalid jwt") ||
    value.includes("jwt") ||
    value.includes("signature");

  return (
    isAuthStatus(candidate.status) ||
    hasAuthPhrase(message) ||
    message.includes("auth_lost") ||
    hasAuthPhrase(reason) ||
    message === "auth" ||
    name.includes("notauthorizedexception")
  );
}
