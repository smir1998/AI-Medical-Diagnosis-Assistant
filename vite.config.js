import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  /* relative asset paths: the built site works from any mount point
     (preview sandboxes, GitHub Pages project sub-paths) without flags */
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    /* react/react-dom split into their own cacheable vendor chunk;
       the transformers.js chunk is lazy by design, so 500KB warnings are noise */
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
