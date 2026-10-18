# Installing NEXUS India

## Windows / macOS / Linux computer

1. Start NEXUS using `start-demo.ps1` on this Windows computer.
2. Allow the frontend build to complete; the launcher now serves the production PWA on port 5173.
3. Open `http://localhost:5173` in regular Chrome or Edge. The VS Code preview does not necessarily support app installation.
4. Select **Install NEXUS**. If the browser has not offered an install prompt, use its menu → install this site/app.
5. Launch NEXUS from the installed app shortcut. `/app` opens login or the signed-in dashboard.

Installing does not embed Java or PostgreSQL into the app. Keep the backend and database running. Closing an app window may require signing in again because tokens are stored per session, not permanently.

## Android

Open the application's reachable **HTTPS** URL in Chrome and choose Install app / Add to Home screen. Launch the resulting icon.

## iPhone / iPad

Open the reachable **HTTPS** URL in Safari → Share → Add to Home Screen. Browser support and wording vary.

## Why localhost is not the phone address

`localhost` always refers to the device you are currently using. A phone cannot reach the laptop's NEXUS server by visiting its own localhost. A plain HTTP LAN address also does not provide the secure context normally needed for service workers and PWA installation.

No public hosting was configured or published during this task. To install on phones, host the app and backend under a reachable HTTPS domain. A deployment template is included, but it requires your domain, DNS, hosting machine, and Docker; those are not assumed to exist.

## Included HTTPS deployment template

`deploy/Dockerfile.pwa` builds the app, and Caddy serves the compiled files and proxies `/api` to Spring Boot. The same-origin API path works from phones without hardcoded laptop localhost URLs. `compose.https.yml` adds HTTPS hosting to the base Compose setup.

On the intended hosting machine, after pointing a real DNS hostname at it and making ports 80/443 reachable:

```powershell
$env:NEXUS_DOMAIN='your-real-domain.example'
$env:JWT_SECRET='replace-with-a-long-random-secret-at-least-32-bytes'
$env:DB_PASSWORD='replace-with-your-database-password'
docker compose -f docker-compose.yml -f compose.https.yml up --build -d
```

Replace the example hostname and credentials. Do not expose development demo accounts with real personal reports. The deployment files were not executed here because Docker and a hosting domain were unavailable. Review account provisioning and deployment configuration before any public use.

## Offline behavior and updates

- Public compiled app files are cached after the first successful service-worker install.
- Private API responses, tokens, external map tiles, and external feeds are not placed in the service-worker cache.
- Opening the installed app offline shows the shell and a connection message. It does not display invented current data.
- Reports and task/resource updates cannot be submitted offline. Nothing is queued silently.
- A new build prompts for an update. Save any form before choosing **Update app**.

## Checks

```powershell
cd D:\nexus_disaster
powershell -ExecutionPolicy Bypass -File .\scripts\check-project.ps1
```

To include database-mutating smoke tests, add `-IncludeDataTests`. Use a separate audit API where possible:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-project.ps1 -ApiUrl http://localhost:8081/api -IncludeDataTests
```

The audit API is optional and must be running; it is not started automatically by that command.
