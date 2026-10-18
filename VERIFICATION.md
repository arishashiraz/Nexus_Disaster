> Latest results: [18 October predeployment audit](docs/PREDEPLOYMENT-AUDIT.md), including air quality and browser/mobile checks. Earlier results below are historical.

# NEXUS implementation and verification report

## Nationwide PWA upgrade — final audit, 17 October 2026

This section supersedes earlier implementation details below where they differ.

- Delivered an installable PWA with standalone entry `/app`, icons, manifest, offline public shell, explicit update prompt, and installation help. Private API data and mutations are never cached by the service worker; submitting changes requires connectivity.
- Added all 28 states and 8 union territories, required state/district reporting, nationwide maps and filters, source labels, and live weather/earthquake panels with provider timestamps and explicit stale/unavailable states.
- Weather comes from Open-Meteo at a named sample location or user-selected coordinates, not a statewide average. USGS earthquakes use an India-region bounding rectangle that includes neighboring countries and offshore events. Neither feed is a complete official Indian disaster-warning service, and neither automatically verifies citizen reports.
- Fixed sidebar/mobile scrolling, duplicate submission handling, stale inventory edits, assignment lock ordering, validation, and database-aware health checks.
- Migrated Tailwind to version 4 with the Vite integration; npm reported **0 known vulnerabilities** after installation. This is a dependency audit result, not a comprehensive security certification.

| Final check | Observed result |
|---|---|
| Backend automated tests | 14 passed, 0 failures/errors |
| PostgreSQL HTTP workflow smoke test | 45 assertions passed against separate `nexus_audit` database |
| All-region live source test | All 36 weather sample locations AVAILABLE; USGS AVAILABLE |
| Running app proxy recheck | 7 representative weather locations and USGS AVAILABLE |
| Production frontend build | Passed after Tailwind 4 upgrade |
| PWA structural and worker execution tests | Passed: icons, manifest, offline navigation, public assets, API/POST/auth/external exclusions |
| Frontend formatting check | Passed |
| Backend packaging | Passed after stopping the audit process that held the JAR open; tests passed before the packaging retry |
| Running app HTTP checks | `/app`, manifest, service worker and proxied `/api/health` returned 200 |
| Existing database preservation | 15 incident reports retained; Flyway versions 1 and 2 successful |

Backup: `.runtime/nexus-before-india-upgrade.dump`. Live audit output: `.runtime/live-all-regions.json`. The main application runs at http://localhost:5173/app, with backend port 8080 and isolated PostgreSQL port 55432.

**Unverified / remaining deployment work:** Browser automation was unavailable, so visual layout, actual desktop/phone installation, and browser offline behavior were not directly verified. Worker behavior was tested programmatically. Docker/HTTPS deployment was not executed. Phones require a reachable HTTPS deployment; localhost on a phone refers to that phone. Optional image uploads remain unimplemented. Seed reports remain explicitly fictional; real feeds are shown separately.

See [PWA installation](docs/PWA-INSTALL.md) and [semester demonstration guide](docs/SEMESTER-DEMO.md). No public deployment or GitHub push was performed.

Executed on **17 October 2026**, Windows, from `D:\nexus_disaster`.

## Delivered

Created the React/Vite frontend, Spring Boot REST backend, PostgreSQL Flyway migration, fictional seed data, JWT authentication, role/ownership enforcement, four role portals, incident reporting and verification, responder and volunteer assignments, operation/task histories, inventory and requests, transactional allocations, shared alerts, maps, analytics, profile forms, Windows startup scripts, environment examples, Docker configuration, and documentation.

The frontend performs real REST requests. No incident, assignment, stock allocation, or alert action is backed only by browser state. Analytics derive from persisted backend records.

## Actual checks

| Check | Result |
|---|---|
| Frontend dependency installation | Passed after retrying with network permission |
| `npm run build` | Passed; 2,364 modules transformed |
| Final frontend bundle | Main 356.15 kB, maps 154.32 kB, charts 435.29 kB (uncompressed) |
| Maven compilation | Passed with Java release target 17 |
| `mvn package -Ddebug=false` | Passed; executable `backend/target/disaster-response-1.0.0.jar` created |
| JUnit/Spring MockMvc suite | **7 tests, 0 failures, 0 errors, 0 skipped** |
| PostgreSQL connectivity | Passed on PostgreSQL 15.16, isolated port 55432 |
| Flyway migration | Applied successfully; subsequent restart validated existing schema |
| Live HTTP smoke test on final code | **45 assertions passed** |
| Concurrent approvals | Two requests for 7 units competed for stock of 10: one HTTP 200, one HTTP 400; 3 units remained |
| Duplicate approval | Rejected with HTTP 400; no repeated deduction |
| Password exposure | User JSON omitted password field |
| JWT protection | Missing and invalid tokens rejected with HTTP 401 |
| Role/ownership controls | Citizen admin actions rejected; unrelated citizen cannot inspect report; unrelated volunteer cannot update task |
| Persistence across restart | User, incident, team, and allocation counts unchanged after restart; seed did not duplicate |
| One-command Windows launcher | Executed successfully; frontend and backend started in hidden processes |
| Frontend HTTP delivery | Homepage and `/admin/analytics` deep-link entry returned HTTP 200 |
| CORS | Localhost and 127.0.0.1 origins passed tests; live 127.0.0.1 preflight returned HTTP 200 and correct origin |
| Source encoding check | Passed; no detected replacement/mojibake sequences in source files |

The HTTP frontend checks validate serving and history fallback, **not** rendered browser interactions.

## Automated backend coverage

1. Citizen report → administrator review → responder assignment → in progress → resolved → citizen history and updated metrics. Includes administrator severity assessment.
2. Registration, duplicate email, invalid password, blocked privileged registration, JWT enforcement, and private report access.
3. Resource approval, ownership/role restrictions, insufficient stock, duplicate review, and negative quantity validation.
4. Volunteer ownership, invalid status transition rejection, accepted/in-progress/completed progression, and activity history.
5. Alert publishing permissions, alert retrieval, profile persistence, and analytics payloads.
6. Invalid incident payloads and blocked resolution of an unverified report.
7. Allowed local CORS origins and rejection of an unrelated origin.

JUnit uses H2 in PostgreSQL compatibility mode. Separately, the live smoke test uses the real PostgreSQL-backed API, including the concurrent approval test. H2 results alone are not being presented as PostgreSQL verification.

## Live final smoke test

```text
PASS: 45 HTTP/status/data assertions against PostgreSQL-backed API.
Verified incident #14, assignments #17/#18, and concurrent inventory approval.
CORS_STATUS=200 ALLOWED_ORIGIN=http://127.0.0.1:5173
FRONTEND_DEEP_LINK_STATUS=200
```

The live tests retained two clearly labelled fictional QA scenarios, so the demonstration database contains the original 12 incidents plus two QA incidents. QA resources, requests, alerts, and registered test citizens are also retained. No real user data was used.

## Issues found and resolved

- Initial Maven/npm downloads were blocked by the sandbox network policy; authorized retries installed dependencies successfully.
- Initial application startup exposed nested JPA entity names not matching JPQL names. Explicit entity names fixed the seed queries; subsequent tests and PostgreSQL startup passed.
- Initial frontend build produced a large-chunk warning. Separate map and chart chunks removed the warning in the final build.
- Added 127.0.0.1 alongside localhost in default CORS configuration and verified both.
- Dialogs support Escape, focus restoration, keyboard focus containment, and visible errors over the modal overlay.

Java 25 emitted test-agent warnings from Mockito/Byte Buddy; these did not fail the seven tests. The project targets Java 17 bytecode.

## Verification limitations and incomplete optional features

- No connected browser was available (`iab` unavailable and browser inventory empty). Visual screenshots, rendered responsive layouts, map tile display, and interactive browser click-throughs were **not** verified.
- No NEXUS presentation file was attached. The supplied specification guided the objectives and architecture; slide-level conformance could not be checked.
- Docker is unavailable here; the Compose configuration and Dockerfile were created but not executed.
- Optional image uploads are not implemented.
- Emergency notifications are persistent shared bulletins with polling, not SMS/email/push delivery or per-user read tracking.
- Public self-registration is restricted to citizens and volunteers. Responder/admin account provisioning and rescue-team editing are not provided through an admin form.
- The application is a local faculty demonstration, not a production emergency dispatch service. Further production requirements are listed in the README.

## Files created

- Root: `README.md`, `VERIFICATION.md`, `.gitignore`, `.env.example`, `docker-compose.yml`, `start-demo.ps1`.
- Frontend setup: `package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `.env.example`.
- Frontend source: `main.jsx`, `styles.css`, `components/UI.jsx`, `components/IncidentMap.jsx`, `context/Auth.jsx`, `layouts/Shell.jsx`, `pages/Public.jsx`, `pages/Workspace.jsx`, `services/api.js`.
- Backend setup: `pom.xml`, `Dockerfile`, `src/main/resources/application.properties`.
- Backend source: `NexusApplication.java`, `config/DemoSeed.java`, `controller/Api.java`, `dto/Inputs.java`, `entity/Models.java`, `exception/Errors.java`, `repository/Store.java`, `security/SecurityConfig.java`, `service/Operations.java`.
- Database: `backend/src/main/resources/db/migration/V1__initial_schema.sql`, `database/README.md`.
- Checks: `backend/src/test/java/com/nexus/disasterresponse/WorkflowTest.java`, `scripts/smoke-test.mjs`.
- Startup: `scripts/start-database.ps1`, `scripts/start-backend.ps1`, `scripts/start-frontend.ps1`.

Ignored local output includes dependencies, compiled bundles, the runnable JAR, portable Node, database files, and runtime logs. These are intentionally excluded from source control.

## Handoff

The launcher has been tested and NEXUS was left running at **http://localhost:5173**. API: **http://localhost:8080/api/health**.

Restart if needed:

```powershell
cd D:\nexus_disaster
powershell -ExecutionPolicy Bypass -File .\start-demo.ps1
```

Use `admin@nexus.demo`, `citizen@nexus.demo`, `volunteer@nexus.demo`, or `responder@nexus.demo`, each with `NexusDemo123!`.

See the README for the faculty walkthrough, exact manual startup commands, complete API list, configuration, GitHub commands, and limitations. No GitHub push was performed.
