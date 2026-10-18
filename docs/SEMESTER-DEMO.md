# NEXUS India — semester demonstration

## What you built

An installable Progressive Web App (PWA) for nationwide disaster reporting and response coordination. Citizens report incidents; administrators verify them and allocate people and supplies; responders and volunteers update progress. A separate Live India screen provides attributed weather model data and regional earthquake events.

The PWA uses React and browser technologies but installs into its own app window. It is not a native Android APK or Windows EXE. The Spring Boot API and PostgreSQL remain the shared backend.

## Suggested 8-minute demonstration

1. **Install and launch (1 minute).** Open localhost:5173 in regular Chrome/Edge. Click **Install NEXUS** or use the browser install option. Launch the app. Its entry point opens login or your dashboard.
2. **Nationwide coverage (1 minute).** Open **Live India**. Select Maharashtra, Assam, Ladakh, and Lakshadweep. Point out each sample city, data timestamp, source, weather estimate, and forecast. Explain that a sample point is not the weather for the whole state.
3. **Citizen reporting (1 minute).** Sign in as `citizen@nexus.demo`. Report a fictional incident in Maharashtra: district Mumbai, latitude `19.0760`, longitude `72.8777`. Use an explicitly fictional title/contact. Show the pending report and its state/district.
4. **Verification and coordination (1 minute).** Sign in as `admin@nexus.demo`. Filter Incidents by Maharashtra, review the report, select verified/high priority, and assign Vikram Shah under Rescue coordination.
5. **Response and citizen tracking (1 minute).** Sign in as `responder@nexus.demo`. Update the assignment to In Progress and Resolved. Sign back in as the citizen to show its saved history.
6. **Resource integrity (1 minute).** Request water as citizen; approve as admin; show inventory deduction. Explain that approval locks rows inside a transaction and repeated approval cannot deduct again.
7. **Volunteers and alerts (1 minute).** Assign Kavya Raj a task on another active verified incident. Show acceptance/progress/completion with `volunteer@nexus.demo`. Publish an explicitly fictional alert as admin.
8. **Engineering evidence (1 minute).** Show `VERIFICATION.md`, the passing tests, Flyway migrations, and source attribution. Explain the PWA offline behavior: the public shell can load, but no report is silently queued or marked sent offline.

All demo passwords: `NexusDemo123!`. These are development-only credentials.

## How to explain the architecture

- **React:** form validation, role navigation, dashboards, maps, install interface.
- **Spring Security:** verifies signed JWTs; passwords are BCrypt hashes.
- **Workflow service:** checks role and record ownership, validates status transitions, coordinates transactions.
- **JPA/PostgreSQL:** persistent relational records, foreign keys, histories, inventory constraints.
- **Flyway:** versioned schema updates that preserve existing records.
- **External feed service:** fixed upstream URLs, request timeouts, shared caching, source timestamps, honest unavailable/stale states.
- **PWA worker:** caches public compiled assets only. It ignores authenticated requests, API routes, external feeds, and mutations.
- **Shared region directory:** one file, `shared/india-regions.json`, used by both React and Java.

## Likely viva questions

**Why use a PWA?** One frontend can be installed on supported computers and phones. It avoids separate native codebases while preserving the requested React/Java architecture. Installation requires HTTPS, except localhost on the current device.

**Is this real-time data?** The app fetches actual external data. Weather is current model output refreshed by NEXUS every ten minutes; earthquakes use a USGS seven-day feed refreshed every five minutes. Provider publication may lag events. It is not a comprehensive official all-disaster warning system.

**Does weather apply to an entire state?** No. Each region starts at an explicitly named sample location. Exact coordinates can be entered. Coordinate selection does not perform administrative polygon validation.

**Does an earthquake automatically become an incident?** No. External context never bypasses report verification or creates a rescue assignment automatically.

**How do you prevent negative stock?** The approval transaction locks the pending request and its inventory row, validates the available quantity, subtracts once, inserts an allocation, and updates the request. Stock has a database nonnegative constraint and each request can have only one allocation.

**What prevents users accessing other reports?** API ownership and assignment checks. Hiding frontend buttons alone would not protect data.

**What happens offline?** Previously installed public app files can load. Sign-in and changes require the server. Forms refuse offline submission; no fake success or invisible emergency queue is used. Existing tokens are retained through a temporary connection failure.

**Do you use machine learning?** No. Priority recommendations use transparent rules based on reported severity, affected population, and disaster category. An administrator decides the priority.

**What remains for production?** Official warning-source agreements, operational procedures, audited account provisioning, hardened credentials, stronger abuse controls, device/browser QA, backups, monitoring, and deployment. A semester prototype is not a certified emergency dispatch service.
