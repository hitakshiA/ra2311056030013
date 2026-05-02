import axios from "axios";
import { Log } from "logging-middleware";
import { credentials } from "logging-middleware/dist/config";
import { obtainBearer } from "logging-middleware/dist/auth";

export interface DepotRecord {
  ID: string | number;
  MechanicHours: number;
}

export interface VehicleRecord {
  TaskID: string | number;
  Duration: number;
  Impact: number;
  DepotID?: string | number;
}

const fleet = axios.create({
  baseURL: credentials.baseUrl,
  timeout: 10_000,
});

fleet.interceptors.request.use(async (cfg) => {
  const token = await obtainBearer(credentials);
  cfg.headers.set("Authorization", `Bearer ${token}`);
  return cfg;
});

export const fetchDepots = async (): Promise<DepotRecord[]> => {
  await Log("backend", "info", "repository", "fetching depots from upstream");
  const { data } = await fleet.get<{ depots: DepotRecord[] }>("/depots");
  return data.depots ?? [];
};

export const fetchVehicles = async (): Promise<VehicleRecord[]> => {
  await Log("backend", "info", "repository", "fetching vehicles from upstream");
  const { data } = await fleet.get<{ vehicles: VehicleRecord[] }>("/vehicles");
  return data.vehicles ?? [];
};
