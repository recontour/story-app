import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020", // This allows the use of import.meta
  },
  esbuild: {
    target: "es2020", // This allows the use of import.meta
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020",
    },
  },
});
