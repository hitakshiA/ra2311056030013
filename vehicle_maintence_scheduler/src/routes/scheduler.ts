import { Router, Request, Response } from "express";
import { Log } from "logging-middleware";
import { computeSchedule } from "../services/scheduler";

export const schedulerRouter = Router();

const handleScheduleRequest = async (_req: Request, res: Response) => {
  try {
    const plan = await computeSchedule();
    res.status(200).json(plan);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "unknown error";
    await Log("backend", "error", "route", `schedule route failed: ${detail}`);
    res.status(502).json({ error: "schedule_unavailable", detail });
  }
};

schedulerRouter.get("/schedule", handleScheduleRequest);
schedulerRouter.post("/schedule", handleScheduleRequest);
