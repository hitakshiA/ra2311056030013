import { NextFunction, Request, Response } from "express";
import { Log } from "logging-middleware";

export const traceHttpRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const elapsed = Date.now() - startedAt;
    void Log(
      "backend",
      "info",
      "middleware",
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsed}ms)`
    );
  });
  next();
};
