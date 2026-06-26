export const SAVED_ROOT_PATH_KEY = "information-lookup.rootPath";

export const SAVED_CLIENT_ROOT_PATH_KEY = "information-lookup.clientRootPath";

export function getStoredRootPath(): string | null {
  try {
    return window.localStorage.getItem(SAVED_ROOT_PATH_KEY);
  } catch {
    return null;
  }
}

export function getInitialRootPath(): string {
  return getStoredRootPath() || "C:\\project\\T5game_data";
}

export function getInitialClientRootPath(): string {
  try {
    return window.localStorage.getItem(SAVED_CLIENT_ROOT_PATH_KEY) || "C:\\project\\T5game_client";
  } catch {
    return "C:\\project\\T5game_client";
  }
}

export function saveRootPath(rootPath: string) {
  try {
    window.localStorage.setItem(SAVED_ROOT_PATH_KEY, rootPath);
  } catch {
    // Storage can be unavailable in restricted browser modes. The scan still works for the current session.
  }
}

export function saveClientRootPath(rootPath: string) {
  try {
    window.localStorage.setItem(SAVED_CLIENT_ROOT_PATH_KEY, rootPath);
  } catch {
    // Same local convenience as the data root path.
  }
}
