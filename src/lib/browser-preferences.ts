const GEMINI_API_KEY_STORAGE_KEY = "ats-cv-ai-checker.geminiApiKey";

function getLocalStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredGeminiApiKey() {
  return getLocalStorage()?.getItem(GEMINI_API_KEY_STORAGE_KEY)?.trim() ?? "";
}

export function saveStoredGeminiApiKey(apiKey: string) {
  const trimmed = apiKey.trim();
  const storage = getLocalStorage();

  if (!storage) return trimmed;

  if (trimmed) {
    storage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
  } else {
    storage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  }

  return trimmed;
}

export function removeStoredGeminiApiKey() {
  getLocalStorage()?.removeItem(GEMINI_API_KEY_STORAGE_KEY);
}

export function hasStoredGeminiApiKey() {
  return getStoredGeminiApiKey().length > 0;
}
