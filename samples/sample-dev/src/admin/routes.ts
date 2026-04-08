import type { Express, Request, Response } from "express";
import {
  adminLogin,
  adminLogout,
  isValidAdminSession,
  getAllToplistEntries,
  addToplistEntry,
  updateToplistEntry,
  removeToplistEntry,
} from "../services/admin";
import {
  activatePremium,
  deactivatePremium,
  getPremiumStatus,
} from "../services/premium";
import { getVoteCountForToplist } from "../services/voting";

function requireAdmin(req: Request, res: Response): boolean {
  const token =
    req.headers["x-admin-token"] as string ||
    (req.query.token as string);
  if (!isValidAdminSession(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export function registerAdminRoutes(app: Express): void {
  app.use((req, _res, next) => {
    if (
      req.method === "POST" ||
      req.method === "PUT" ||
      req.method === "DELETE"
    ) {
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          (req as any).jsonBody = body ? JSON.parse(body) : {};
        } catch {
          (req as any).jsonBody = {};
        }
        next();
      });
    } else {
      next();
    }
  });

  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { email, password } = (req as any).jsonBody || {};
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const result = adminLogin(email, password);
    if (result.success) {
      res.json({ token: result.token });
    } else {
      res.status(401).json({ error: result.error });
    }
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    const token = req.headers["x-admin-token"] as string;
    if (token) adminLogout(token);
    res.json({ success: true });
  });

  app.get("/api/admin/session", (req: Request, res: Response) => {
    const token = req.headers["x-admin-token"] as string;
    res.json({ valid: isValidAdminSession(token) });
  });

  app.get("/api/admin/toplist", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const entries = getAllToplistEntries().map((e) => ({
      ...e,
      voteCount: getVoteCountForToplist(e.id),
    }));
    res.json(entries);
  });

  app.post("/api/admin/toplist", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const { name, bannerUrl, voteUrl, enabled } = (req as any).jsonBody || {};
    if (!name || !voteUrl) {
      res.status(400).json({ error: "name and voteUrl required" });
      return;
    }
    const entry = addToplistEntry({
      name,
      bannerUrl: bannerUrl || "",
      voteUrl,
      enabled: enabled !== false,
    });
    res.json(entry);
  });

  app.put("/api/admin/toplist/:id", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const updated = updateToplistEntry(
      req.params.id,
      (req as any).jsonBody || {}
    );
    if (!updated) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.json(updated);
  });

  app.delete("/api/admin/toplist/:id", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const removed = removeToplistEntry(req.params.id);
    res.json({ success: removed });
  });

  app.post("/api/admin/premium/:playerId", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const { duration } = (req as any).jsonBody || {};
    const durationMs = duration ? duration * 60 * 60 * 1000 : null;
    const status = activatePremium(req.params.playerId, durationMs, "admin");
    res.json(status);
  });

  app.delete("/api/admin/premium/:playerId", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    deactivatePremium(req.params.playerId);
    res.json({ success: true });
  });

  app.get("/api/admin/premium/:playerId", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json(getPremiumStatus(req.params.playerId));
  });
}
