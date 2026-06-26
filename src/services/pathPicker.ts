export async function pickFolder(initialPath: string): Promise<string> {
  const response = await fetch(`/api/pick-folder?initial=${encodeURIComponent(initialPath)}`);
  const payload = (await response.json()) as { path?: string; error?: string };
  if (!response.ok || payload.error) throw new Error(payload.error ?? "选择目录失败");
  return payload.path ?? "";
}
