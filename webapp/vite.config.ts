import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 10879,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": { target: "http://127.0.0.1:10878", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:10878", changeOrigin: true },
      "/mcp": { target: "http://127.0.0.1:10878", changeOrigin: true },
    },
  },
});
