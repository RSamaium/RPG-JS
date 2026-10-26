import { defineConfig } from "vite";

/** A stand-in for the Studio: a page on another origin (port 5194) that embeds the game (port 5192) and drives it. */
export default defineConfig({
  root: __dirname,
  server: { port: 5194, strictPort: true, fs: { allow: ["../../../.."] } },
});
