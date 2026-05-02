# Notification System Design

A campus notification platform that surfaces Placements, Results, and Events to students in real time. This document covers the API contract, data model, scaling concerns, and the ranking implementation across six stages.

## Stage 1 - Requirements and Use Cases

### Functional
- Surface notifications to a user, ordered so the most important unread items appear first.
- Each notification has a `Type` (`Placement` | `Result` | `Event`), a `Message`, and a `Timestamp`.
- A notification can be marked read; read notifications drop out of the priority inbox view.
- The system must expose a `top-N unread` query - the caller asks for the next N items to act on.
- Type carries weight: `Placement = 3`, `Result = 2`, `Event = 1`. Within a weight bucket, more recent notifications come first.

### Non-functional
- Read latency on the inbox endpoint must stay under ~200ms at P95 with thousands of notifications cached.
- The upstream source of truth (`/notifications`) is treated as authoritative for the catalog; read state is local to this service.
- Bearer auth on every upstream call, with token caching and refresh on 401.
- All operational logs go through the shared logging middleware - no console output.

### Out of scope (for stage 6)
- Push delivery (websocket, APNs, FCM).
- Multi-tenant fan-out, retention policies, or archival.
- User authentication on the inbox endpoint itself (single-user assessment context).

## Stage 2 - API Design

```
GET  /inbox?limit=10
GET  /inbox/all
POST /inbox/:id/read
POST /inbox/refresh
```

### `GET /inbox`
Query params: `limit` (default 10, clamped 1..100).
Response:
```json
{
  "items": [
    {
      "id": "string",
      "type": "Placement|Result|Event",
      "message": "string",
      "timestamp": "ISO-8601",
      "weight": 3,
      "read": false
    }
  ],
  "totalUnread": 42,
  "fetchedAt": "ISO-8601"
}
```

### `GET /inbox/all`
Returns the full hydrated cache, read and unread, for debugging and for the screenshot evidence.

### `POST /inbox/:id/read`
Marks a single notification as read. Idempotent.

### `POST /inbox/refresh`
Forces an upstream refresh of the cache. Useful for demo and for the priority inbox endpoint to be deterministic during a screenshot.

## Stage 3 - Data Model

Two stores, both in-process for stage 6:

| Store        | Key   | Value                                        |
|--------------|-------|----------------------------------------------|
| `catalog`    | `id`  | `{ id, type, message, timestamp }`           |
| `readSet`    | `id`  | boolean (presence == read)                   |

Computed projection for the inbox response:
```
weight(Placement) = 3
weight(Result)    = 2
weight(Event)     = 1

sortKey(item) = (-weight(type), -epochMillis(timestamp))
```

The projection runs on read. With N notifications it is `O(N log N)` per request, which is fine at the volumes the upstream returns. If N grew to the millions a heap-of-N would be the next step.

## Stage 4 - Component Architecture

```
+--------------------------+
|       HTTP Routes        |  routes/inbox.ts
+------------+-------------+
             |
+------------v-------------+
|      Inbox Service       |  services/inbox.ts
|  - rank, paginate        |
|  - read-state mutations  |
+------+--------------+----+
       |              |
+------v--+   +-------v-------+
| Catalog |   |  Source       |
| Cache   |   |  Client       |  axios + bearer
| (Map)   |   |  /auth, /logs,|
+---------+   |  /notifications|
              +---------------+
                      |
+---------------------v--------------------+
|        Logging Middleware (shared)       |
|  initLogger, Log(stack, level, pkg, msg) |
+------------------------------------------+
```

Boundaries:
- The route layer is thin - it parses query params, calls the service, serializes JSON.
- The service owns the ranking and the read set. It does not know about HTTP.
- The source client owns axios, bearer caching, and upstream URL composition.
- The logging middleware is the only interface to observability - every layer above it calls `Log(...)` for non-trivial events.

## Stage 5 - Scaling, Reliability, Observability

### Scaling
- Per-instance memory: hundreds of bytes per notification, so a single node holds ~500k items in <100MB.
- Beyond that, move `catalog` to Redis with a sorted-set keyed on the composite sort key (`weight` in the high bits, `-timestamp` in the low bits) so `top-N` becomes `ZRANGE 0 N-1`.
- Read set fan-out: a per-user Redis set of read IDs, fronted by a small in-process LRU.

### Reliability
- Bearer token cache with absolute-expiry awareness; on 401 the middleware invalidates and retries once.
- Upstream `/notifications` is fetched on first request and on demand; failures fall back to the last successful snapshot (serving the last known good response instead of a 502).
- All write actions (mark-read) are idempotent; replay is safe.

### Observability
- Every layer logs through `Log(stack, level, package, message)`. Packages used:
  - `route` - request entry/exit, status codes
  - `service` - ranking decisions, cache hits/misses
  - `repository` - upstream calls
  - `middleware` - per-request trace
  - `config` - startup
  - `auth` - bearer issued / refreshed
- Log levels follow the spec: `info` for routine flow, `warn` for empty upstream payloads or stale-cache reads, `error` for HTTP failures, `fatal` reserved for boot failure.

## Stage 6 - Implementation Approach

Stage 6 implements the priority inbox as a working backend in notification_app_be/.

1. On boot, `initLogger()` configures the shared middleware. The Express app mounts a request-trail middleware that emits one `Log("backend","info","middleware",...)` per request.
2. The `SourceClient` shares the same axios pattern as Q1: an interceptor calls `obtainBearer()` from the logging middleware before every upstream request, so `/notifications` calls are always authenticated and refresh on 401.
3. The first hit on `GET /inbox` (or an explicit `POST /inbox/refresh`) hydrates the in-process catalog from upstream.
4. The inbox service projects the catalog through `rankInbox(items, readSet, limit)`:
   - filter out items in `readSet`
   - assign weight by `Type`
   - sort by `(-weight, -timestampEpoch)`
   - take the first `limit`
5. The handler returns `{ items, totalUnread, fetchedAt }`.
6. `POST /inbox/:id/read` adds the id to the local read set and returns the new unread count. The catalog is not mutated - read state is a separate concern, matching stage 3.

Known limitations:
- In-memory state means the read set resets on restart. In production this would move to Redis or a small Postgres table; the service interface (markRead, isRead) is already shaped for that swap.
- Single-user assumption - there is no `userId` on the read set. The shape of the read store leaves room to key by user when multi-tenant becomes a requirement.
