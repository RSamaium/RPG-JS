import type { IncomingMessage, ServerResponse } from "node:http";
import {
  adminLogin,
  adminLogout,
  isValidAdminSession,
  getAllToplistEntries,
  addToplistEntry,
  updateToplistEntry,
  removeToplistEntry,
} from "./admin";
import {
  activatePremium,
  deactivatePremium,
  getPremiumStatus,
  isPremium,
} from "./premium";
import {
  createPremiumOrder,
  captureOrder,
  isPayPalConfigured,
  getPayPalClientId,
} from "./paypal";
import { getToplistEntries } from "./admin";
import { recordVote, canVote, getVoteHistory, getVoteCountForToplist } from "./voting";
import {
  createHouse,
  getPlayerHouse,
  placeFurniture,
  removeFurniture,
  uploadCustomTexture,
  getCustomTextures,
  removeCustomTexture,
} from "./housing";
import { createChatMessage, getChatHistory } from "./chat";

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function json(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function html(res: ServerResponse, content: string, status = 200) {
  res.writeHead(status, { "Content-Type": "text/html" });
  res.end(content);
}

function getAdminToken(req: IncomingMessage): string {
  return (req.headers["x-admin-token"] as string) || "";
}

function parseUrl(url: string): { pathname: string; query: Record<string, string> } {
  const u = new URL(url, "http://localhost");
  const query: Record<string, string> = {};
  u.searchParams.forEach((v, k) => (query[k] = v));
  return { pathname: u.pathname, query };
}

export function createApiMiddleware() {
  return async function apiMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    const { pathname, query } = parseUrl(req.url || "");
    const method = req.method || "GET";

    if (!pathname.startsWith("/api/")) {
      next();
      return;
    }

    const body = method === "POST" || method === "PUT" || method === "DELETE"
      ? await readBody(req)
      : {};

    // --- Admin routes ---
    if (pathname === "/api/admin/login" && method === "POST") {
      const { email, password } = body;
      if (!email || !password) return json(res, { error: "Email and password required" }, 400);
      const result = adminLogin(email, password);
      return result.success ? json(res, { token: result.token }) : json(res, { error: result.error }, 401);
    }

    if (pathname === "/api/admin/logout" && method === "POST") {
      const token = getAdminToken(req);
      if (token) adminLogout(token);
      return json(res, { success: true });
    }

    if (pathname === "/api/admin/session" && method === "GET") {
      return json(res, { valid: isValidAdminSession(getAdminToken(req)) });
    }

    if (pathname === "/api/admin/toplist" && method === "GET") {
      if (!isValidAdminSession(getAdminToken(req))) return json(res, { error: "Unauthorized" }, 401);
      return json(res, getAllToplistEntries().map(e => ({ ...e, voteCount: getVoteCountForToplist(e.id) })));
    }

    if (pathname === "/api/admin/toplist" && method === "POST") {
      if (!isValidAdminSession(getAdminToken(req))) return json(res, { error: "Unauthorized" }, 401);
      const { name, bannerUrl, voteUrl, enabled } = body;
      if (!name || !voteUrl) return json(res, { error: "name and voteUrl required" }, 400);
      return json(res, addToplistEntry({ name, bannerUrl: bannerUrl || "", voteUrl, enabled: enabled !== false }));
    }

    const toplistMatch = pathname.match(/^\/api\/admin\/toplist\/(.+)$/);
    if (toplistMatch) {
      if (!isValidAdminSession(getAdminToken(req))) return json(res, { error: "Unauthorized" }, 401);
      if (method === "PUT") return json(res, updateToplistEntry(toplistMatch[1], body) || { error: "Not found" });
      if (method === "DELETE") return json(res, { success: removeToplistEntry(toplistMatch[1]) });
    }

    const adminPremiumMatch = pathname.match(/^\/api\/admin\/premium\/(.+)$/);
    if (adminPremiumMatch) {
      if (!isValidAdminSession(getAdminToken(req))) return json(res, { error: "Unauthorized" }, 401);
      const pid = adminPremiumMatch[1];
      if (method === "GET") return json(res, getPremiumStatus(pid));
      if (method === "POST") {
        const durationMs = body.duration ? body.duration * 60 * 60 * 1000 : null;
        return json(res, activatePremium(pid, durationMs, "admin"));
      }
      if (method === "DELETE") { deactivatePremium(pid); return json(res, { success: true }); }
    }

    // --- Public routes ---
    const premiumStatusMatch = pathname.match(/^\/api\/premium\/status\/(.+)$/);
    if (premiumStatusMatch && method === "GET") {
      return json(res, getPremiumStatus(premiumStatusMatch[1]));
    }

    if (pathname === "/api/paypal/config" && method === "GET") {
      return json(res, { configured: isPayPalConfigured(), clientId: isPayPalConfigured() ? getPayPalClientId() : null });
    }

    if (pathname === "/api/paypal/create-order" && method === "POST") {
      if (!isPayPalConfigured()) return json(res, { error: "PayPal not configured" }, 503);
      if (!body.playerId) return json(res, { error: "playerId required" }, 400);
      try {
        const host = req.headers.host || "localhost:5173";
        const order = await createPremiumOrder(body.playerId, `http://${host}/api/paypal/success`, `http://${host}/api/paypal/cancel`);
        return json(res, order);
      } catch (err: any) {
        return json(res, { error: err.message }, 500);
      }
    }

    if (pathname === "/api/paypal/success" && method === "GET") {
      const orderId = query.token || query.orderId;
      if (!orderId) return json(res, { error: "orderId required" }, 400);
      try {
        const result = await captureOrder(orderId);
        if (result.success && result.playerId) {
          activatePremium(result.playerId, null, "paypal");
          return html(res, `<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:#fff;"><h1 style="color:#ffd700;">&#x2714; Premium Activated!</h1><p>Enjoy 150% XP, housing, and golden chat name!</p><a href="/" style="color:#ffd700;">Return to Game</a></body></html>`);
        }
        return html(res, `<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:#fff;"><h1 style="color:#f44;">Payment Failed</h1><a href="/" style="color:#ffd700;">Return</a></body></html>`, 400);
      } catch (err: any) {
        return json(res, { error: err.message }, 500);
      }
    }

    if (pathname === "/api/paypal/cancel" && method === "GET") {
      return html(res, `<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:#fff;"><h1>Payment Cancelled</h1><a href="/" style="color:#ffd700;">Return</a></body></html>`);
    }

    if (pathname === "/api/toplist" && method === "GET") {
      return json(res, getToplistEntries());
    }

    if (pathname === "/api/vote" && method === "POST") {
      if (!body.playerId || !body.toplistId) return json(res, { error: "playerId and toplistId required" }, 400);
      return json(res, recordVote(body.playerId, body.toplistId));
    }

    const voteCheckMatch = pathname.match(/^\/api\/vote\/check\/([^/]+)\/(.+)$/);
    if (voteCheckMatch && method === "GET") {
      return json(res, { canVote: canVote(voteCheckMatch[1], voteCheckMatch[2]) });
    }

    const voteHistoryMatch = pathname.match(/^\/api\/vote\/history\/(.+)$/);
    if (voteHistoryMatch && method === "GET") {
      return json(res, getVoteHistory(voteHistoryMatch[1]));
    }

    const housingMatch = pathname.match(/^\/api\/housing\/([^/]+)$/);
    if (housingMatch && method === "GET") {
      const house = getPlayerHouse(housingMatch[1]);
      return json(res, house || { error: "No house found" });
    }

    if (pathname === "/api/housing/create" && method === "POST") {
      if (!body.playerId || !body.name) return json(res, { error: "playerId and name required" }, 400);
      if (!isPremium(body.playerId)) return json(res, { error: "Premium required" }, 403);
      return json(res, createHouse(body.playerId, body.name));
    }

    if (pathname === "/api/housing/furniture" && method === "POST") {
      if (!body.playerId || !body.type) return json(res, { error: "playerId and type required" }, 400);
      if (!isPremium(body.playerId)) return json(res, { error: "Premium required" }, 403);
      const item = placeFurniture(body.playerId, { type: body.type, x: body.x || 0, y: body.y || 0, rotation: body.rotation || 0, textureId: body.textureId });
      return json(res, item || { error: "House not found" });
    }

    if (pathname === "/api/housing/texture" && method === "POST") {
      if (!body.playerId || !body.name || !body.dataUrl) return json(res, { error: "playerId, name, and dataUrl required" }, 400);
      if (!isPremium(body.playerId)) return json(res, { error: "Premium required for textures" }, 403);
      const tex = uploadCustomTexture(body.playerId, body.name, body.dataUrl);
      return tex ? json(res, tex) : json(res, { error: "Texture too large (max 512KB)" }, 400);
    }

    const texturesMatch = pathname.match(/^\/api\/housing\/textures\/(.+)$/);
    if (texturesMatch && method === "GET") {
      return json(res, getCustomTextures(texturesMatch[1]));
    }

    if (pathname === "/api/chat/history" && method === "GET") {
      return json(res, getChatHistory());
    }

    if (pathname === "/api/chat/send" && method === "POST") {
      if (!body.playerId || !body.text) return json(res, { error: "playerId and text required" }, 400);
      return json(res, createChatMessage(body.playerId, body.playerName || "Anonymous", body.text));
    }

    next();
  };
}
