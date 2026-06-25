import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readSavedRootPath, saveSavedRootPath, scanLevelLookup } from "./server/levelLookup";

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

          const rootPath = await readSavedRootPath();
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ rootPath }));
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
            const body = JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}") as { rootPath?: string };
            const result = await scanLevelLookup(body.rootPath ?? "");
            await saveSavedRootPath(result.rootPath);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "扫描失败" }));
          }
        });
      },
    },
  ],
});
