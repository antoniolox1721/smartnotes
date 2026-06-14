// ============================================================================
// vite.config.js  —  settings for Vite, the tool that builds our React app.
//
// "Building" means: take our friendly React files and turn them into plain
// HTML/CSS/JS that any browser understands, saved into the "dist" folder.
// Cloudflare then serves that "dist" folder as the website.
// ============================================================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],          // lets Vite understand React (.jsx) files
  build: { outDir: "dist" },   // put the finished website in the "dist" folder

  // During local development (`npm run dev`), our React app runs on one address
  // but the data API lives on the deployed Worker. This "proxy" quietly forwards
  // any "/api/..." request to the live Worker, so everything just works locally.
  server: {
    proxy: {
      "/api": {
        target: "https://smartnotes.aloureiro-pedro.workers.dev",
        changeOrigin: true,
      },
    },
  },
});
