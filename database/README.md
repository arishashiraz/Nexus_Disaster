# Database

The authoritative Flyway migrations are under `backend/src/main/resources/db/migration/`: V1 creates the schema; V2 adds state, district, incident-source labels, and a larger review-history note field. Keep migrations there to avoid divergent copies.

The demo initializer runs in a single transaction only when `admin@nexus.demo` does not exist. Restarting does not duplicate seed records. Set `SEED_DEMO=false` to disable it.

Responder and volunteer tasks share `assignments`, differentiated by `kind` and the assignee's role. Histories live in `incident_status_history` and `assignment_history`. Inventory approvals create an immutable `resource_allocations` row linked uniquely to its request. Request and stock rows are pessimistically locked in the same transaction. All quantities have database check constraints.

Emergency notifications are persisted bulletins in `emergency_alerts`, surfaced on all dashboards with 30-second refresh. There is no email, SMS, push, or per-user read/unread delivery.

The optional isolated Windows database uses port 55432 and loopback-only trust authentication for local fictional demonstrations. It does not modify the installed PostgreSQL service or its databases. Do not use this database configuration on a shared or production machine.

The nationwide migration preserves existing records. It identifies explicitly Chennai-labelled legacy reports as Tamil Nadu; other unclassified legacy reports remain unspecified rather than guessing a state. External weather and earthquake feeds are read-only cached context, separate from the incident tables.
