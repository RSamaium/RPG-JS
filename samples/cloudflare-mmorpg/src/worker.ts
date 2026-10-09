import {
  RpgServerDurableObject,
  createRpgServerWorker,
} from "@rpgjs/server/cloudflare";
import serverModule from "./server";

export { RpgServerDurableObject };

interface Env extends Record<string, unknown> {
  RPGJS_ROOMS: DurableObjectNamespace;
  RPGJS_MAP_UPDATE_TOKEN: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
}

const roomWorker = createRpgServerWorker(serverModule, {
  binding: "RPGJS_ROOMS",
  partiesPath: "/parties/main",
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/parties/")) {
      return roomWorker.fetch(request, env, ctx);
    }
    return env.ASSETS?.fetch(request) ?? new Response("Not Found", { status: 404 });
  },
};
