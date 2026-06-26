import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readClientImage, readSavedSettings, saveSavedRootPath, scanLevelLookup } from "./server/levelLookup";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function pickFolder(initialPath: string): Promise<string> {
  const script = `
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding
Add-Type -AssemblyName System.Windows.Forms
$dialog = [System.Windows.Forms.FolderBrowserDialog]::new()
$dialog.Description = '选择文件夹'
$dialog.ShowNewFolderButton = $false
$initial = ${JSON.stringify(initialPath)}
if ($initial -and [System.IO.Directory]::Exists($initial)) { $dialog.SelectedPath = $initial }
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }
`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script], { encoding: "utf8" });
  return stdout.trim();
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "level-info-api",
      configureServer(server) {
        server.middlewares.use("/api/level-info/settings", async (req, res) => {
          if (req.method !== "GET") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          const settings = await readSavedSettings();
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(settings));
        });

        server.middlewares.use("/api/level-info/scan", async (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const body = JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}") as { rootPath?: string; clientRootPath?: string };
            const result = await scanLevelLookup(body.rootPath ?? "");
            await saveSavedRootPath(result.rootPath, body.clientRootPath ?? "");
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "扫描失败" }));
          }
        });

        server.middlewares.use("/api/client-image", async (req, res) => {
          if (req.method !== "GET") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          const url = new URL(req.url ?? "", "http://localhost");
          const buffer = await readClientImage(url.searchParams.get("rootPath") ?? "", url.searchParams.get("name") ?? "");
          if (!buffer) {
            res.statusCode = 404;
            res.end("Not Found");
            return;
          }
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "no-store");
          res.end(buffer);
        });

        server.middlewares.use("/api/pick-folder", async (req, res) => {
          if (req.method !== "GET") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          try {
            const url = new URL(req.url ?? "", "http://localhost");
            const selectedPath = await pickFolder(url.searchParams.get("initial") ?? "");
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ path: selectedPath }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "选择目录失败" }));
          }
        });
      },
    },
  ],
});
