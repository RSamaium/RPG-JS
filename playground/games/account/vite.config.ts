import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";
import playgroundConfig from "./playground.config.json";

type MiddlewareStack = {
  use(path: string, handler: (request: IncomingMessage, response: ServerResponse) => void): void;
};

interface MockUser {
  username: string;
  email: string;
  password: string;
}

const users: MockUser[] = [{
  username: "hero",
  email: "hero@example.com",
  password: "swordfish",
}];
const resets = new Map<string, { email: string; expires: number }>();

function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => body += chunk);
    request.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function installMockAccountApi(middlewares: MiddlewareStack): void {
  middlewares.use("/api/mock-account", async (request, response) => {
    if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" });
    try {
      const body = await readJson(request);
      const password = typeof body.password === "string" ? body.password : "";
      if (request.url === "/forgot-password") {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (users.some(user => user.email === email)) {
          for (const [key, reset] of resets) if (reset.email === email) resets.delete(key);
          const token = crypto.randomUUID();
          resets.set(token, { email, expires: Date.now() + 15 * 60_000 });
          // Local mock email delivery: never return this code from a real endpoint.
          console.info("[Mock reset email]", email, "Recovery code:", token);
        }
        return json(response, 200, {});
      }
      if (request.url === "/reset-password") {
        const token = typeof body.token === "string" ? body.token : "";
        const reset = resets.get(token);
        if (!reset || reset.expires <= Date.now()) return json(response, 400, { error: "invalid_reset" });
        if (!password || password !== body.passwordConfirmation) return json(response, 400, { error: "password_confirmation" });
        const user = users.find(user => user.email === reset.email);
        if (!user) return json(response, 400, { error: "invalid_reset" });
        user.password = password;
        resets.delete(token);
        return json(response, 200, {});
      }

      if (request.url === "/sign-up") {
        const username = typeof body.username === "string" ? body.username.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const passwordConfirmation = typeof body.passwordConfirmation === "string"
          ? body.passwordConfirmation
          : "";
        if (!username || !email || !password || !passwordConfirmation) {
          return json(response, 400, { error: "missing_credentials" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: "invalid_email" });
        if (password !== passwordConfirmation) {
          return json(response, 400, { error: "password_confirmation" });
        }
        if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
          return json(response, 409, { error: "username_taken" });
        }
        if (users.some((user) => user.email === email)) {
          return json(response, 409, { error: "email_taken" });
        }
        users.push({ username, email, password });
        return json(response, 200, {
          token: `mock-token:${encodeURIComponent(email)}`,
        });
      }

      const identifier = typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
      if (!identifier || !password) return json(response, 400, { error: "missing_credentials" });
      const user = users.find((candidate) =>
        candidate.email === identifier || candidate.username.toLowerCase() === identifier
      );
      if (request.url !== "/sign-in" || user?.password !== password) {
        return json(response, 401, { error: "invalid_credentials" });
      }

      return json(response, 200, {
        token: `mock-token:${encodeURIComponent(user.email)}`,
      });
    }
    catch {
      return json(response, 400, { error: "invalid_json" });
    }
  });
}

function mockAccountApi(): Plugin {
  return {
    name: "rpgjs-playground-mock-account-api",
    configureServer(server) { installMockAccountApi(server.middlewares); },
    configurePreviewServer(server) { installMockAccountApi(server.middlewares); },
  };
}

export default defineConfig({
  optimizeDeps: { include: ["pixi.js > @xmldom/xmldom"] },
  server: { port: playgroundConfig.port, strictPort: true },
  plugins: [
    mockAccountApi(),
    ...rpgjs({
      server: startServer,
      entryPoints: {
        mmorpg: { client: "./src/client.ts", server: "./src/server.ts" },
      },
    }),
  ],
});
