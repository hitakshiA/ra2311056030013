import { Router, Request, Response } from "express";
import { Log } from "logging-middleware";
import {
  buildFullView,
  buildInboxView,
  markAsRead,
  refreshInbox,
} from "../services/inbox";

export const inboxRouter = Router();

inboxRouter.get("/inbox", async (req: Request, res: Response) => {
  try {
    const limit = Number.parseInt(String(req.query.limit ?? "10"), 10);
    const view = await buildInboxView(Number.isFinite(limit) ? limit : 10);
    res.status(200).json(view);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "unknown error";
    await Log("backend", "error", "route", `inbox route failed: ${detail}`);
    res.status(502).json({ error: "inbox_unavailable", detail });
  }
});

inboxRouter.get("/inbox/all", async (_req: Request, res: Response) => {
  try {
    const view = await buildFullView();
    res.status(200).json(view);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "unknown error";
    await Log("backend", "error", "route", `inbox/all route failed: ${detail}`);
    res.status(502).json({ error: "inbox_unavailable", detail });
  }
});

inboxRouter.post("/inbox/:id/read", async (req: Request, res: Response) => {
  const id = req.params.id;
  const outcome = await markAsRead(id);
  res.status(outcome.ok ? 200 : 404).json(outcome);
});

inboxRouter.post("/inbox/refresh", async (_req: Request, res: Response) => {
  const outcome = await refreshInbox();
  res.status(200).json(outcome);
});
