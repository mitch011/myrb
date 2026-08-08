import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@audio": path.resolve(__dirname, "src/audio"),
      "@chart": path.resolve(__dirname, "src/chart"),
      "@gameplay": path.resolve(__dirname, "src/gameplay"),
      "@input": path.resolve(__dirname, "src/input"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@models": path.resolve(__dirname, "src/models"),
    },
  },
  server: {
    host: true,
  },
  test: {
    environment: "node",
  },
});
