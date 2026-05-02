import { Log } from "logging-middleware";
import {
  NotificationType,
  UpstreamNotification,
  fetchNotifications,
} from "./source_client";

export interface InboxItem {
  id: string | number;
  type: NotificationType;
  message: string;
  timestamp: string;
  weight: number;
  read: boolean;
}

export interface InboxView {
  items: InboxItem[];
  totalUnread: number;
  fetchedAt: string;
}

const TYPE_WEIGHT: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

const catalog: Map<string | number, UpstreamNotification> = new Map();
const readSet: Set<string | number> = new Set();
let lastFetchedAt: string | null = null;

const epochOf = (iso: string): number => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

const weightOf = (type: NotificationType): number => TYPE_WEIGHT[type] ?? 0;

const refreshCatalog = async (): Promise<void> => {
  const upstream = await fetchNotifications();
  catalog.clear();
  for (const n of upstream) {
    catalog.set(n.ID, n);
  }
  lastFetchedAt = new Date().toISOString();
  await Log(
    "backend",
    "info",
    "service",
    `catalog refreshed: ${catalog.size} notifications loaded`
  );
};

const ensureCatalog = async (): Promise<void> => {
  if (catalog.size === 0) {
    await refreshCatalog();
  }
};

const projectItem = (n: UpstreamNotification): InboxItem => ({
  id: n.ID,
  type: n.Type,
  message: n.Message,
  timestamp: n.Timestamp,
  weight: weightOf(n.Type),
  read: readSet.has(n.ID),
});

const compareForInbox = (a: InboxItem, b: InboxItem): number => {
  if (b.weight !== a.weight) return b.weight - a.weight;
  return epochOf(b.timestamp) - epochOf(a.timestamp);
};

export const buildInboxView = async (limit: number): Promise<InboxView> => {
  await ensureCatalog();
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);

  const projected: InboxItem[] = [];
  let totalUnread = 0;
  for (const n of catalog.values()) {
    const item = projectItem(n);
    if (!item.read) {
      projected.push(item);
      totalUnread += 1;
    }
  }
  projected.sort(compareForInbox);

  const top = projected.slice(0, safeLimit);
  await Log(
    "backend",
    "info",
    "service",
    `inbox view: ${top.length}/${totalUnread} unread, limit=${safeLimit}`
  );

  return {
    items: top,
    totalUnread,
    fetchedAt: lastFetchedAt ?? new Date().toISOString(),
  };
};

export const buildFullView = async (): Promise<InboxView> => {
  await ensureCatalog();
  const all = Array.from(catalog.values()).map(projectItem);
  all.sort(compareForInbox);
  return {
    items: all,
    totalUnread: all.filter((i) => !i.read).length,
    fetchedAt: lastFetchedAt ?? new Date().toISOString(),
  };
};

export const markAsRead = async (
  id: string | number
): Promise<{ ok: boolean; totalUnread: number }> => {
  await ensureCatalog();
  if (!catalog.has(id)) {
    await Log(
      "backend",
      "warn",
      "service",
      `mark-read requested for unknown id: ${id}`
    );
    return { ok: false, totalUnread: catalog.size - readSet.size };
  }
  readSet.add(id);
  await Log("backend", "info", "service", `notification marked read: ${id}`);
  return { ok: true, totalUnread: catalog.size - readSet.size };
};

export const refreshInbox = async (): Promise<{ count: number; fetchedAt: string }> => {
  await refreshCatalog();
  return {
    count: catalog.size,
    fetchedAt: lastFetchedAt ?? new Date().toISOString(),
  };
};
