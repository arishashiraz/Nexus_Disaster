# Coordinator demonstration checklist

Public app: https://nexus-india.onrender.com/app

1. Open the public app a few minutes before the demonstration. Render's free service sleeps after inactivity, so the first request can take a minute or more. No paid hosting upgrade has been made.
2. Click Sign in once and leave the screen open. The updated login allows up to two minutes and shows a server-starting explanation after eight seconds. It does not automatically repeat login or account-creation requests.
3. Use admin@nexus.demo with NexusDemo123!, then inspect Live India, incidents, assignments and resources. Other role accounts use the same demo password.
4. On the phone, open the public HTTPS URL in Chrome and accept the NEXUS update if offered. Physical-device installation remains separate from desktop browser viewport tests.
5. Check Render's database expiry date before the demonstration. Its free database expires 30 days after creation.
6. If the server remains unavailable, check /api/health and Render logs. For submission or account-creation timeouts, check whether the operation completed before submitting again.

Local startup bounds Java heap sizes. If Windows is low on memory, close unused applications before starting the local backend or browser tests. This does not change hosted Render resources.
