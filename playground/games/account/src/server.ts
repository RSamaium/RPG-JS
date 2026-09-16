import {
  createServer,
  provideServerModules,
  type RpgServerAuthSocket,
} from "@rpgjs/server";
import { provideMain } from "./modules/main";

function accountFromToken(token: string | undefined): string | null {
  if (!token?.startsWith("mock-token:")) return null;
  try {
    return decodeURIComponent(token.slice("mock-token:".length)) || null;
  }
  catch {
    return null;
  }
}

export default createServer({
  providers: [
    {
      engine: {
        auth(_server, socket: RpgServerAuthSocket) {
          const identifier = accountFromToken(socket.handshake.query.token);
          if (!identifier) throw new Error("Invalid local mock token");
          return {
            id: `account:${identifier}`,
            data: { identifier, provider: "local-mock" },
          };
        },
        onAuthFailed(_server, error) {
          console.warn("[account-playground] authentication rejected", error);
        },
      },
    },
    provideMain(),
    provideServerModules([]),
  ],
});
