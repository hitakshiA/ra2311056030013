import express from "express";
import { Log } from "logging-middleware";
import { bootstrapLogger } from "./core/bootstrap";
import { traceHttpRequest } from "./core/request_log";
import { inboxRouter } from "./routes/inbox";

bootstrapLogger();

const app = express();
app.use(express.json());
app.use(traceHttpRequest);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/", inboxRouter);

const PORT = Number(process.env.PORT ?? 4002);

app.listen(PORT, () => {
  void Log("backend", "info", "config", `notification inbox listening on ${PORT}`);
});
