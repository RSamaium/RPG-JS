import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { WebSocketServer } from "ws";
import { createRpgServerTransport } from "@rpgjs/server/node";
import serverModule from "../server";
import { registerAdminRoutes } from "../admin/routes";
import { registerPublicRoutes } from "../admin/public-routes";

const app = express();
const httpServer = createServer(app);
const wsServer = new WebSocketServer({ noServer: true });
const transport = createRpgServerTransport(serverModule);
const currentDir = dirname(fileURLToPath(import.meta.url));
const clientDistDir = resolve(currentDir, "../client");
const clientIndexFile = join(clientDistDir, "index.html");
const port = Number(process.env.PORT || 3000);

registerAdminRoutes(app);
registerPublicRoutes(app);

app.use("/parties", async (req, res, next) => {
  await transport.handleNodeRequest(req, res, next, {
    mountedPath: "/parties",
  });
});

app.use(express.static(clientDistDir));

app.get(/.*/, (_req, res) => {
  res.sendFile(clientIndexFile);
});

// Health check endpoint for Docker/orchestration
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

httpServer.on("upgrade", (request, socket, head) => {
  void transport.handleUpgrade(wsServer, request, socket, head);
});

httpServer.listen(port, () => {
  console.log(`[sample-dev] Express adapter listening on http://localhost:${port}`);
});
