# Predeployment audit - 18 October 2026

## Outcome

The local academic demo is running at http://localhost:5173. Live India now has
weather, air quality, and regional earthquakes. No deployment was performed.
This is a tested local demo, not a certified emergency service or a completed
production-readiness assessment.

## Added and fixed

- Added authenticated `/api/live/air-quality`, using Open-Meteo / CAMS global
  model data for PM2.5, PM10 and US AQI. Supports all 36 region sample points and
  custom coordinates within the existing regional map extent.
- Displays data time, fetch time, attribution and availability separately.
  Weather and air quality refresh every ten minutes; earthquakes every five.
  Polling is not instant sensor streaming. Model publication can lag and updates
  less frequently than app refreshes. US AQI is distinct from Indian CPCB AQI.
- Shared coordinate validation and cache controls. Missing/nonnumeric provider
  values are rejected. Upstream failures preserve original timestamps on
  last-known data and mark it STALE, or return UNAVAILABLE with no fabricated data.
- Each browser feed now owns its error/loading state and aborts superseded
  requests. A successful weather response cannot erase an earthquake error.
- Fixed the corrupted installable app title and two leftover punctuation labels.
- HTTPS Compose overlay requires database/JWT secrets and defaults demo seeding
  off. Local demo startup remains available with its fictional accounts.

## Executed checks

| Check | Result |
| --- | --- |
| Spring/JUnit suite | 17 tests passed, zero failures/errors |
| PostgreSQL HTTP workflows | 45 assertions passed |
| Actual weather API | All 36 state/UT sample points AVAILABLE |
| Actual air-quality API | All 36 state/UT sample points AVAILABLE |
| USGS regional feed | AVAILABLE, four regional events at check time |
| Browser regression suite | 11 tests passed in installed Edge |
| Frontend production build | Passed |
| Frontend formatting | Passed |
| PWA artifact and worker tests | Passed |
| npm dependency audit during install | Zero known vulnerabilities reported |
| Git patch whitespace check | Passed |

Live weather data times were 18 October 2026 14:30 UTC; air-quality data times
were 14:00 UTC. A final seven-location recheck after the backend restart also
passed. Availability and event counts will change with the providers.

Backend and PostgreSQL coverage includes authorization, ownership, nationwide
report validation, verification, responder/volunteer transitions, histories,
resource requests, concurrent inventory approval, duplicate approval prevention,
registration, profile changes, alerts and analytics. The PostgreSQL smoke check
created clearly labelled fictional QA records (incident 16 and assignments 21/22)
and retained them in the local demo database.

Browser checks cover sign-in, all 31 role routes, sign-out, rejected credentials,
role boundaries, public pages, mobile navigation, state/custom-point selection,
feed failure isolation and slow-response cancellation. All role routes were also
checked at 390 x 844. Live India screenshots at 390 x 844 and 1440 x 1000 were
visually inspected. No horizontal page overflow was detected.

A real service worker was tested offline in Edge: the public shell loads, the
offline notice is shown, and cache storage contains no API response URLs.
Separate worker execution tests cover private/authenticated requests, external
requests, POST requests, and preservation of unrelated caches.

## Still required before public deployment

1. Choose hosting and an HTTPS domain. Docker is not installed here; container
   builds, Compose execution, TLS/DNS and host networking remain unverified.
2. Provision trusted administrator/responder accounts in a fresh database.
   No production provisioning/password-recovery workflow exists yet. Setting
   SEED_DEMO=false does not remove previously seeded accounts or QA records.
   Keep any intentionally public demo explicitly fictional.
3. Supply unique deployment secrets and plan database backups/restore, monitoring,
   abuse/rate limiting, and authentication/session hardening for public use.
   No load test or independent penetration test was performed. Lists are still
   unpaginated, and logout does not centrally revoke already-issued JWTs.
4. Test actual installation, update behavior, and interaction on Android Chrome
   and iPhone Safari using the hosted HTTPS address. Viewport emulation is not
   physical-device testing; iOS/WebKit has not been tested here.

Live feeds remain separate from citizen reports. No IMD/NDMA/CWC official warning
integration, automatic dispatch or automatic verification has been added.
Weather and air-quality values are model estimates, not local station readings.

## Repeatable commands

With the local app running:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-project.ps1
# Optional workflow mutations: append -IncludeDataTests
& .\.tools\node-v22.16.0-win-x64\node.exe scripts/check-live.mjs --all
cd frontend
npm run test:browser
```

Browser tests use installed Edge by default; BROWSER_CHANNEL=chrome selects
installed Chrome. Test artifacts are under frontend/test-results (Git-ignored).

## Provider documentation

- Weather: https://open-meteo.com/en/docs
- Air quality, coverage and attribution: https://open-meteo.com/en/docs/air-quality-api
- USGS GeoJSON: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php

## Render preparation recheck — 19 October 2026

- Repaired a null-byte-corrupted render.yaml and validated it against Render's Blueprint JSON schema.
- Combined Docker build packages the production PWA inside Spring Boot. The app and API share one origin; public page routes forward to the SPA while protected API routes still require authentication.
- Free Singapore web service and PostgreSQL configured, with generated JWT secret, private-only database access and explicit fictional demo seeding. Auto deployment is disabled.
- Backend regression: 18 tests passed. Combined JAR packaging passed.
- Production frontend build and PWA manifest/worker checks passed.
- PostgreSQL workflow check: 45 assertions passed against nexus_audit, not the user's nexus database.
- All 36 weather and air-quality sample points plus the USGS feed returned AVAILABLE with actual provider timestamps.
- npm production dependency audit: zero known vulnerabilities.
- Render resources have not yet been created. Local combined-JAR testing does not verify the Linux container build or hosted TLS. Physical phone installation must be checked after Render supplies the actual HTTPS URL.
- Browser recheck against the combined JAR: all 11 Edge tests passed, including all role routes, phone viewport layouts and actual offline service-worker behavior. Frontend formatting also passed.
