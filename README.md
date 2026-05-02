# ra2311056030013

Backend assessment workspace: a shared logging middleware, a vehicle maintenance scheduler, and a priority notification inbox.

## Layout

| Path                            | Purpose                                                              |
|---------------------------------|----------------------------------------------------------------------|
| `logging_middleware/`           | Reusable TypeScript package. Bearer auth + `Log()` against `/logs`.  |
| `vehicle_maintence_scheduler/`  | Q1. 0/1 knapsack per depot over `Duration`/`Impact` vehicle tasks.   |
| `notification_app_be/`          | Q2 stage 6. Priority inbox over `/notifications`.                    |
| `notification_system_design.md` | Q2 stages 1–5 plus the stage 6 implementation approach.              |

## How to run

Each TypeScript project is independent. Install once at the package root, build, then start.

```bash
cd logging_middleware && npm install && npm run build && cd ..

cd vehicle_maintence_scheduler && npm install && npm run build && npm start
cd notification_app_be && npm install && npm run build && npm start
```

`vehicle_maintence_scheduler` listens on `:4001`.
`notification_app_be` listens on `:4002`.
Override either with `PORT=...`.

## Endpoints

### vehicle_maintence_scheduler (`:4001`)

| Method | Path        | Purpose                                                  |
|--------|-------------|----------------------------------------------------------|
| GET    | `/health`   | Liveness                                                 |
| GET    | `/schedule` | Run knapsack per depot, return per-depot selections      |
| POST   | `/schedule` | Same as GET, for clients that prefer POST               |

### notification_app_be (`:4002`)

| Method | Path                  | Purpose                                          |
|--------|-----------------------|--------------------------------------------------|
| GET    | `/health`             | Liveness                                         |
| GET    | `/inbox?limit=N`      | Top-N unread, ranked by type weight then recency |
| GET    | `/inbox/all`          | Full hydrated cache (debug)                      |
| POST   | `/inbox/:id/read`     | Mark a notification as read                      |
| POST   | `/inbox/refresh`      | Force upstream refresh                           |

## Tech

- TypeScript, Node.js, Express
- axios for upstream calls
- 0/1 knapsack DP written in-package (no algorithm libraries)
- Shared logging middleware consumed via `file:` workspace dependency
