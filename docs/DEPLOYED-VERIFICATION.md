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


## Login reliability follow-up - 24 October 2026

A phone screenshot showed the client abandoning login after 25 seconds. The first hosted health probe also timed out; a subsequent probe returned UP and all four role logins succeeded. This is consistent with Render free-tier startup latency rather than a credential error. Hosted weather, air-quality and earthquake checks passed for seven representative state/UT locations.

Prepared fix: authentication and session restoration allow up to 120 seconds; the login screen explains a slow connection after eight seconds; requests are not automatically replayed; malformed startup responses cannot be stored as authenticated sessions. Other API operations retain their existing timeout. Local backend startup uses bounded Java heap sizes after a Windows memory-allocation failure was observed.

The production build and PWA artifact/worker checks passed. Two browser tests deliberately delayed actual login responses by 27 seconds: both desktop (1440 px) and phone (390 px) passed with exactly one login submission. The updated frontend was served locally against the hosted API through a temporary localhost test proxy to reduce memory pressure. This is not a physical-phone installation test or a controlled Render cold-start experiment. The public app must deploy the new commit before receiving the fix.

The final broader browser run passed 10 of 11 checks; the phone-navigation check timed out while Windows virtual memory was nearly exhausted. The unchanged phone test passed in a fresh-browser rerun (4.9 seconds). Together with the two slow-login tests, all 13 distinct browser scenarios passed, but not in a single uninterrupted run.
