import axios from "axios";
import { AuthEnvelope, LoggerConfig } from "./types";

let bearerToken: string | null = null;
let bearerExpiresAt = 0;
let inflight: Promise<string> | null = null;

const REFRESH_GUARD_MS = 30_000;
const FALLBACK_TTL_MS = 14 * 60 * 1000;

export const obtainBearer = async (cfg: LoggerConfig): Promise<string> => {
  const now = Date.now();
  if (bearerToken && now < bearerExpiresAt - REFRESH_GUARD_MS) {
    return bearerToken;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const response = await axios.post<AuthEnvelope>(
      `${cfg.baseUrl}/auth`,
      {
        email: cfg.email,
        name: cfg.name,
        rollNo: cfg.rollNo,
        accessCode: cfg.accessCode,
        clientID: cfg.clientID,
        clientSecret: cfg.clientSecret,
      },
      { timeout: 10_000 }
    );
    const data = response.data;
    bearerToken = data.access_token;
    const nowMs = Date.now();
    if (!data.expires_in) {
      bearerExpiresAt = nowMs + FALLBACK_TTL_MS;
    } else if (data.expires_in > 1_000_000_000) {
      bearerExpiresAt = data.expires_in * 1000;
    } else {
      bearerExpiresAt = nowMs + data.expires_in * 1000;
    }
    inflight = null;
    return bearerToken;
  })().catch((err) => {
    inflight = null;
    throw err;
  });

  return inflight;
};

export const invalidateBearer = (): void => {
  bearerToken = null;
  bearerExpiresAt = 0;
};
