import { REQUIRED_FILES } from '../config/requiredFiles';
import { MatchedFile, RequiredFileKey } from '../types';

export async function collectFilesFromDirectory(rootHandle: FileSystemDirectoryHandle): Promise<MatchedFile[]> {
  const matches = new Map<RequiredFileKey, MatchedFile>();
  const requiredByName = new Map(REQUIRED_FILES.map((file) => [file.fileName, file]));

  async function walk(handle: FileSystemDirectoryHandle, trail: string[]) {
    for await (const [name, child] of handle.entries()) {
      if (child.kind === "file") {
        const required = requiredByName.get(name);
        if (required && !matches.has(required.key)) {
          const file = await child.getFile();
          matches.set(required.key, {
            ...required,
            relativePath: [...trail, name].join("/"),
            file,
          });
        }
      }

      if (child.kind === "directory") {
        if (matches.size === REQUIRED_FILES.length) continue;
        await walk(child, [...trail, name]);
      }
    }
  }

  await walk(rootHandle, [rootHandle.name]);
  return REQUIRED_FILES.map((required) => matches.get(required.key)).filter(Boolean) as MatchedFile[];
}
