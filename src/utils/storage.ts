const MAYA_KEY_PREFIXES = ["maya:"];

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

export function getThreadStorageKey(subKey: string) {
  return `maya:${subKey}:threadHandle`;
}
