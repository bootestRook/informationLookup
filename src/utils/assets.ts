export function clientImageUrl(clientRootPath: string, resourceName: string, kind = "skin"): string {
  return `/api/client-image?rootPath=${encodeURIComponent(clientRootPath)}&name=${encodeURIComponent(resourceName)}&kind=${encodeURIComponent(kind)}`;
}

export function localImageUrl(resourceName: string, kind: "monster" | "skin"): string {
  return `/indexed-images/${kind}/${encodeURIComponent(resourceName.replace(/\.png$/i, ""))}.png`;
}
