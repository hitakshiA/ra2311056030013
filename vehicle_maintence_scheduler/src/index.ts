import express from "express";
import { Log } from "logging-middleware";
import { bootstrapLogger } from "./core/bootstrap";
import { requestLogTrail } from "./core/request_log";
import { schedulerRouter } from "./routes/scheduler";

bootstrapLogger();

const app = express();
app.use(express.json());
app.use(requestLogTrail);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/", schedulerRouter);

const PORT = Number(process.env.PORT ?? 4001);

app.listen(PORT, () => {
  void Log("backend", "info", "config", `vehicle scheduler listening on ${PORT}`);
});
