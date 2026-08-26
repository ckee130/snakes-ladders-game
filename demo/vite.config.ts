import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  publicDir: false,
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: path.resolve(root, "../demo-dist"),
    emptyOutDir: true,
  },
});
