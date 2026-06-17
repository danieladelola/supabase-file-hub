import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function apiRoutesPlugin(env: Record<string, string>): Plugin {
  return {
    name: "api-routes-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        const route = req.url.split("?")[0].replace(/^\/api\//, "");
        try {
          const mod = await server.ssrLoadModule(
            path.resolve(__dirname, `api/${route}.ts`),
          );
          const handler = mod.default;
          if (typeof handler !== "function") return next();

          // Ensure env is exposed to the handler
          for (const [k, v] of Object.entries(env)) {
            if (process.env[k] === undefined) process.env[k] = v;
          }

          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = Buffer.concat(chunks);

          const url = `http://${req.headers.host}${req.url}`;
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (Array.isArray(v)) headers.set(k, v.join(","));
            else if (typeof v === "string") headers.set(k, v);
          }
          const request = new Request(url, {
            method: req.method,
            headers,
            body: ["GET", "HEAD"].includes(req.method ?? "") ? undefined : body,
          });

          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          const ab = await response.arrayBuffer();
          res.end(Buffer.from(ab));
        } catch (err: any) {
          console.error(`[api] ${route} failed:`, err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err?.message ?? "Internal error" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), apiRoutesPlugin(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});