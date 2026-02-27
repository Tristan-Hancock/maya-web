const MAYA_KEY_PREFIXES = ["maya:"];
const COGNITO_CLIENT_ID = (import.meta.env.VITE_COGNITO_APP_CLIENT_ID as string | undefined)?.toLowerCase();
const COGNITO_KEY_PREFIXES = COGNITO_CLIENT_ID
  ? [`cognitoidentityserviceprovider.${COGNITO_CLIENT_ID}`]
  : ["cognitoidentityserviceprovider."];

function clearMatching(storage: Storage, predicates: string[]) {
  const keys = Object.keys(storage);
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (predicates.some((p) => lower.startsWith(p) || lower.includes(p))) {
      storage.removeItem(key);
    }
  }
}

export function clearMayaScopedStorage() {
  try {
    clearMatching(localStorage, MAYA_KEY_PREFIXES);
  } catch {
    // ignore storage access errors
  }

  try {
    clearMatching(sessionStorage, MAYA_KEY_PREFIXES);
  } catch {
    // ignore storage access errors
  }
}

export function clearMayaAuthStorage() {
  try {
    clearMatching(localStorage, COGNITO_KEY_PREFIXES);
  } catch {
    // ignore storage access errors
  }

  try {
    clearMatching(sessionStorage, COGNITO_KEY_PREFIXES);
  } catch {
    // ignore storage access errors
  }
}

export function getThreadStorageKey(subKey: string) {
  return `maya:${subKey}:threadHandle`;
}
