import axios from "axios";
import { invalidateBearer, obtainBearer } from "./auth";
import { credentials } from "./config";
import {
  Level,
  LogPackage,
  LogPayload,
  LoggerConfig,
  Stack,
} from "./types";

let runtimeConfig: LoggerConfig = credentials;

export const initLogger = (override?: Partial<LoggerConfig>): void => {
  runtimeConfig = { ...credentials, ...(override ?? {}) };
};

const dispatchLogPayload = async (
  cfg: LoggerConfig,
  payload: LogPayload
): Promise<void> => {
  const token = await obtainBearer(cfg);
  await axios.post(`${cfg.baseUrl}/logs`, payload, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 8000,
  });
};

export const Log = async (
  stack: Stack,
  level: Level,
  pkg: LogPackage,
  message: string
): Promise<void> => {
  const payload: LogPayload = { stack, level, package: pkg, message };
  try {
    await dispatchLogPayload(runtimeConfig, payload);
  } catch (firstErr: unknown) {
    const status =
      typeof firstErr === "object" &&
      firstErr !== null &&
      "response" in firstErr
        ? (firstErr as { response?: { status?: number } }).response?.status
        : undefined;
    if (status === 401 || status === 403) {
      invalidateBearer();
      try {
        await dispatchLogPayload(runtimeConfig, payload);
      } catch {
        return;
      }
    }
  }
};

export type {
  Level,
  LogPackage,
  LogPayload,
  LoggerConfig,
  Stack,
} from "./types";
