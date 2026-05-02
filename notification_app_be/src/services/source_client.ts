import axios from "axios";
import { Log } from "logging-middleware";
import { credentials } from "logging-middleware/dist/config";
import { obtainBearer } from "logging-middleware/dist/auth";

export type NotificationType = "Placement" | "Result" | "Event";

export interface UpstreamNotification {
  ID: string | number;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

const upstream = axios.create({
  baseURL: credentials.baseUrl,
  timeout: 10_000,
});

upstream.interceptors.request.use(async (cfg) => {
  const token = await obtainBearer(credentials);
  cfg.headers.set("Authorization", `Bearer ${token}`);
  return cfg;
});

export const fetchNotifications = async (): Promise<UpstreamNotification[]> => {
  await Log("backend", "info", "repository", "fetching notifications from upstream");
  const { data } = await upstream.get<{ notifications: UpstreamNotification[] }>(
    "/notifications"
  );
  return data.notifications ?? [];
};
