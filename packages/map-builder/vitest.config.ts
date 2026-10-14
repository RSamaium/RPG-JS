import { defineConfig } from "vitest/config";

// The model, pipeline, committers and sources must run without a DOM, so the
// package tests run in plain Node.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
