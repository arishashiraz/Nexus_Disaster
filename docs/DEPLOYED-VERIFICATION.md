# NEXUS hosted verification

Date: 19 October 2026 (Asia/Kolkata)

Public app: https://nexus-india.onrender.com/app
Application commit checked: 4543ba1

## Public endpoint checks

- HTTPS app entry, manifest and service worker: HTTP 200.
- Database-backed health endpoint: application NEXUS, status UP, database UP.
- Admin, citizen, volunteer and responder demo logins: passed.
- All 36 state/UT weather sample points: AVAILABLE, source MET Norway.
- All 36 air-quality sample points: AVAILABLE, source Open-Meteo/CAMS.
- USGS regional earthquakes: AVAILABLE (4 events at check time).

Weather data is a model forecast, not a ground-station observation. The weather provider replacement fixed the previously observed Open-Meteo HTTP 429 failure on this deployment. Future external-provider availability is not guaranteed.

The public deployment is an academic demonstration with intentionally public fictional accounts. Do not enter sensitive real incident information. The free Render service can sleep when idle, and its free database expires 30 days after creation; confirm the expiry in Render before the submission or viva date.

Physical Android/iPhone installation remains a user device check. Browser phone-viewport tests do not constitute physical-device or Safari verification.

Local predeployment tests and limitations are recorded in PREDEPLOYMENT-AUDIT.md. Detailed run outputs are local under .runtime/hosted-met-live.log and .runtime/hosted-met-browser.log (not committed).

## Hosted browser regression

All 11 Edge tests passed against https://nexus-india.onrender.com in 2.6 minutes. Coverage: four-role navigation and sign-out, login rejection and role boundaries, phone layout and custom coordinates, feed error isolation, offline shell without API caching, desktop layout, all role pages at phone viewport, and stale-response cancellation.
