import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Generate a unique build ID (changes every build)
const BUILD_ID = Date.now().toString(36);

// Plugin: writes build-meta.json so the SW can detect redeployments
function buildMetaPlugin(): Plugin {
  return {
    name: "build-meta",
    writeBundle(options) {
      const outDir = options.dir || path.resolve(import.meta.dirname, "dist/public");
      fs.writeFileSync(
        path.join(outDir, "build-meta.json"),
        JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() })
      );
    },
    configureServer(server) {
      // In dev, serve a dev-mode build-meta.json
      server.middlewares.use("/build-meta.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ buildId: "dev", builtAt: new Date().toISOString() }));
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    buildMetaPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

