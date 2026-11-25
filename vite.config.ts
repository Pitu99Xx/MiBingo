import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Número de versión: 1.0.<número de publicación en GitHub>. En local, "dev".
const run = process.env.GITHUB_RUN_NUMBER;
const VERSION = run ? `1.0.${run}` : "dev";
const BUILT_AT = new Date().toISOString();

// Publica /version.json para que la app sepa si hay una versión más nueva.
const versionFile = (): Plugin => ({
  name: "version-file",
  apply: "build",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: VERSION, builtAt: BUILT_AT }) });
  }
});

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __APP_VERSION__: JSON.stringify(VERSION), __BUILT_AT__: JSON.stringify(BUILT_AT) },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks: { firebase: ["firebase/app", "firebase/auth", "firebase/firestore"] } }
    }
  }
});
