import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import bundlesize from "vite-plugin-bundlesize";

export default defineConfig({
  plugins: [
    react(),
    bundlesize({
      limits: [{ name: "assets/index-*.js", limit: "120 kB" }],
    }),
  ],
  build: {
    sourcemap: "hidden",
  },
});
