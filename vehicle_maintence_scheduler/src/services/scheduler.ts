import { Log } from "logging-middleware";
import { DepotRecord, VehicleRecord, fetchDepots, fetchVehicles } from "./source_client";
import { KnapItem, KnapResult, solveZeroOneKnapsack } from "./knapsack";

export interface DepotPlan {
  depotId: string | number;
  mechanicHours: number;
  selection: {
    taskId: string | number;
    duration: number;
    impact: number;
  }[];
  totalImpact: number;
  totalDuration: number;
  taskCount: number;
}

export interface SchedulePlan {
  totalImpact: number;
  depots: DepotPlan[];
}

const groupVehiclesByDepot = (
  vehicles: VehicleRecord[],
  depots: DepotRecord[]
): Map<string | number, VehicleRecord[]> => {
  const buckets = new Map<string | number, VehicleRecord[]>();
  const hasDepotAttribution = vehicles.some(
    (v) => v.DepotID !== undefined && v.DepotID !== null
  );

  if (hasDepotAttribution) {
    for (const v of vehicles) {
      const key = v.DepotID ?? "__unassigned";
      const bucket = buckets.get(key) ?? [];
      bucket.push(v);
      buckets.set(key, bucket);
    }
    return buckets;
  }

  for (const d of depots) {
    buckets.set(d.ID, vehicles);
  }
  return buckets;
};

const toKnapItems = (vehicles: VehicleRecord[]): KnapItem[] =>
  vehicles.map((v) => ({
    taskId: v.TaskID,
    duration: v.Duration,
    impact: v.Impact,
  }));

const planForDepot = (depot: DepotRecord, items: KnapItem[]): DepotPlan => {
  const result: KnapResult = solveZeroOneKnapsack(items, depot.MechanicHours);
  return {
    depotId: depot.ID,
    mechanicHours: depot.MechanicHours,
    selection: result.selected.map((s) => ({
      taskId: s.taskId,
      duration: s.duration,
      impact: s.impact,
    })),
    totalImpact: result.totalImpact,
    totalDuration: result.totalDuration,
    taskCount: result.selected.length,
  };
};

export const computeSchedule = async (): Promise<SchedulePlan> => {
  await Log("backend", "info", "service", "computing maintenance schedule");
  const [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);

  if (!depots.length) {
    await Log("backend", "warn", "service", "no depots returned upstream");
    return { totalImpact: 0, depots: [] };
  }
  if (!vehicles.length) {
    await Log("backend", "warn", "service", "no vehicles returned upstream");
  }

  const grouped = groupVehiclesByDepot(vehicles, depots);
  const plans: DepotPlan[] = depots.map((d) => {
    const candidates = grouped.get(d.ID) ?? [];
    return planForDepot(d, toKnapItems(candidates));
  });

  const totalImpact = plans.reduce((s, p) => s + p.totalImpact, 0);
  await Log(
    "backend",
    "info",
    "service",
    `schedule computed: ${plans.length} depots, totalImpact=${totalImpact}`
  );
  return { totalImpact, depots: plans };
};
