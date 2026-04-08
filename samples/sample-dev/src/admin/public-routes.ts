import type { Express, Request, Response } from "express";
import {
  createPremiumOrder,
  captureOrder,
  isPayPalConfigured,
  getPayPalClientId,
} from "../services/paypal";
import {
  activatePremium,
  getPremiumStatus,
  isPremium,
} from "../services/premium";
import { getToplistEntries } from "../services/admin";
import { recordVote, canVote, getVoteHistory } from "../services/voting";
import {
  createHouse,
  getPlayerHouse,
  placeFurniture,
  removeFurniture,
  uploadCustomTexture,
  getCustomTextures,
  removeCustomTexture,
} from "../services/housing";
import { createChatMessage, getChatHistory } from "../services/chat";

export function registerPublicRoutes(app: Express): void {
  app.get("/api/premium/status/:playerId", (req: Request, res: Response) => {
    res.json(getPremiumStatus(req.params.playerId));
  });

  app.get("/api/paypal/config", (_req: Request, res: Response) => {
    res.json({
      configured: isPayPalConfigured(),
      clientId: isPayPalConfigured() ? getPayPalClientId() : null,
    });
  });

  app.post("/api/paypal/create-order", async (req: Request, res: Response) => {
    const { playerId } = (req as any).jsonBody || {};
    if (!playerId) {
      res.status(400).json({ error: "playerId required" });
      return;
    }
    if (!isPayPalConfigured()) {
      res.status(503).json({ error: "PayPal not configured" });
      return;
    }
    try {
      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const baseUrl = `${protocol}://${host}`;
      const order = await createPremiumOrder(
        playerId,
        `${baseUrl}/api/paypal/success?orderId=ORDERID&playerId=${playerId}`,
        `${baseUrl}/api/paypal/cancel`
      );
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/paypal/success", async (req: Request, res: Response) => {
    const orderId = req.query.token as string || req.query.orderId as string;
    if (!orderId) {
      res.status(400).json({ error: "orderId required" });
      return;
    }
    try {
      const result = await captureOrder(orderId);
      if (result.success && result.playerId) {
        activatePremium(result.playerId, null, "paypal");
        res.send(`
          <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:#fff;">
            <h1 style="color:#ffd700;">&#x2714; Premium Activated!</h1>
            <p>Your premium membership is now active. Enjoy 150% XP, housing, and golden chat name!</p>
            <p><a href="/" style="color:#ffd700;">Return to Game</a></p>
          </body></html>
        `);
      } else {
        res.status(400).send(`
          <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:#fff;">
            <h1 style="color:#ff4444;">Payment Failed</h1>
            <p>${result.error || "Unknown error"}</p>
            <p><a href="/" style="color:#ffd700;">Return to Game</a></p>
          </body></html>
        `);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/paypal/cancel", (_req: Request, res: Response) => {
    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:#fff;">
        <h1>Payment Cancelled</h1>
        <p><a href="/" style="color:#ffd700;">Return to Game</a></p>
      </body></html>
    `);
  });

  app.get("/api/toplist", (_req: Request, res: Response) => {
    res.json(getToplistEntries());
  });

  app.post("/api/vote", (req: Request, res: Response) => {
    const { playerId, toplistId } = (req as any).jsonBody || {};
    if (!playerId || !toplistId) {
      res.status(400).json({ error: "playerId and toplistId required" });
      return;
    }
    const result = recordVote(playerId, toplistId);
    res.json(result);
  });

  app.get("/api/vote/check/:playerId/:toplistId", (req: Request, res: Response) => {
    res.json({ canVote: canVote(req.params.playerId, req.params.toplistId) });
  });

  app.get("/api/vote/history/:playerId", (req: Request, res: Response) => {
    res.json(getVoteHistory(req.params.playerId));
  });

  app.get("/api/housing/:playerId", (req: Request, res: Response) => {
    const house = getPlayerHouse(req.params.playerId);
    res.json(house || { error: "No house found" });
  });

  app.post("/api/housing/create", (req: Request, res: Response) => {
    const { playerId, name } = (req as any).jsonBody || {};
    if (!playerId || !name) {
      res.status(400).json({ error: "playerId and name required" });
      return;
    }
    if (!isPremium(playerId)) {
      res.status(403).json({ error: "Premium membership required for housing" });
      return;
    }
    const house = createHouse(playerId, name);
    res.json(house);
  });

  app.post("/api/housing/furniture", (req: Request, res: Response) => {
    const { playerId, type, x, y, rotation, textureId } = (req as any).jsonBody || {};
    if (!playerId || !type) {
      res.status(400).json({ error: "playerId and type required" });
      return;
    }
    if (!isPremium(playerId)) {
      res.status(403).json({ error: "Premium membership required" });
      return;
    }
    const item = placeFurniture(playerId, {
      type,
      x: x || 0,
      y: y || 0,
      rotation: rotation || 0,
      textureId,
    });
    res.json(item || { error: "House not found" });
  });

  app.delete("/api/housing/furniture/:playerId/:furnitureId", (req: Request, res: Response) => {
    const removed = removeFurniture(req.params.playerId, req.params.furnitureId);
    res.json({ success: removed });
  });

  app.post("/api/housing/texture", (req: Request, res: Response) => {
    const { playerId, name, dataUrl } = (req as any).jsonBody || {};
    if (!playerId || !name || !dataUrl) {
      res.status(400).json({ error: "playerId, name, and dataUrl required" });
      return;
    }
    if (!isPremium(playerId)) {
      res.status(403).json({ error: "Premium membership required for custom textures" });
      return;
    }
    const texture = uploadCustomTexture(playerId, name, dataUrl);
    if (!texture) {
      res.status(400).json({ error: "Texture too large (max 512KB)" });
      return;
    }
    res.json(texture);
  });

  app.get("/api/housing/textures/:playerId", (req: Request, res: Response) => {
    res.json(getCustomTextures(req.params.playerId));
  });

  app.delete("/api/housing/texture/:playerId/:textureId", (req: Request, res: Response) => {
    const removed = removeCustomTexture(req.params.playerId, req.params.textureId);
    res.json({ success: removed });
  });

  app.get("/api/chat/history", (_req: Request, res: Response) => {
    res.json(getChatHistory());
  });

  app.post("/api/chat/send", (req: Request, res: Response) => {
    const { playerId, playerName, text } = (req as any).jsonBody || {};
    if (!playerId || !text) {
      res.status(400).json({ error: "playerId and text required" });
      return;
    }
    const msg = createChatMessage(playerId, playerName || "Anonymous", text);
    res.json(msg);
  });
}
