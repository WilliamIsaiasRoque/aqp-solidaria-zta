import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "frontend",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../dist/frontend", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://6r66dyrf0h.execute-api.us-east-2.amazonaws.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
