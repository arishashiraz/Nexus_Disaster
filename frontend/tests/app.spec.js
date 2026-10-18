import { test, expect } from '@playwright/test';
const routes = {
  citizen: ['dashboard', 'live', 'report', 'incidents', 'resources', 'alerts', 'profile'],
  volunteer: ['dashboard', 'live', 'assignments', 'alerts', 'profile'],
  responder: ['dashboard', 'live', 'incidents', 'assignments', 'map', 'alerts', 'profile'],
  admin: [
    'dashboard',
    'live',
    'incidents',
    'assignments',
    'volunteers',
    'resources',
    'requests',
    'alerts',
    'map',
    'analytics',
    'profile',
  ],
};
async function login(page, role) {
  await page.goto('/login');
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/' + role.toLowerCase() + '/dashboard'));
}
for (const role of Object.keys(routes)) {
  test(role + ' can sign in, open all role pages and sign out', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const failures = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 400) failures.push(r.status() + ' ' + r.url());
    });
    await login(page, role[0].toUpperCase() + role.slice(1));
    for (const route of routes[role]) {
      await page.goto('/' + role + '/' + route);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main .loading')).toHaveCount(0, { timeout: 30000 });
    }
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/login/);
    await page.goto('/' + role + '/dashboard');
    await expect(page).toHaveURL(/login/);
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  });
}
test('phone layout, live values, precise location and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'Citizen');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Live India', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.locator('.feed-status')).toHaveText(
    ['Source connected', 'Source connected', 'Source connected'],
    { timeout: 30000 },
  );
  await expect(page.getByRole('region', { name: 'Air quality' })).toContainText('PM2.5');
  await page.getByLabel('State / union territory').selectOption('TN');
  await expect(page.getByRole('region', { name: 'Air quality' })).toContainText('Chennai', {
    timeout: 30000,
  });
  await page.getByText('Choose a precise location', { exact: true }).click();
  await page.getByLabel('Latitude', { exact: true }).fill('13.08');
  await page.getByLabel('Longitude', { exact: true }).fill('80.27');
  await page.getByRole('button', { name: 'Get local weather' }).click();
  await expect(page.getByRole('region', { name: 'Air quality' })).toContainText(
    'Selected coordinates',
    { timeout: 30000 },
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/live-mobile.png', fullPage: true });
});
test('one feed failure remains visible when other feeds succeed', async ({ page }) => {
  await login(page, 'Citizen');
  await page.route('**/api/live/earthquakes', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Earthquake test outage' }),
    }),
  );
  await page.goto('/citizen/live');
  await expect(page.getByRole('alert')).toContainText('Earthquake test outage');
  await expect(page.locator('.feed-status').first()).toHaveText('Source connected', {
    timeout: 30000,
  });
  await expect(page.getByRole('alert')).toContainText('Earthquake test outage');
  await expect(page.locator('.feed-status').last()).toHaveText('Source unavailable');
});
test('invalid login, role boundary and public pages', async ({ page }) => {
  for (const path of ['/', '/about', '/register', '/unknown']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.goto('/login');
  await page.getByLabel('Email address').fill('citizen@nexus.demo');
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await login(page, 'Citizen');
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/unauthorized/);
});

test('offline public shell loads without caching private API responses', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:5173/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.goto('http://127.0.0.1:5173/about');
    await expect(page.getByRole('heading', { name: /A shared platform/ })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('offline');
    const keys = await page.evaluate(async () => {
      const names = await caches.keys();
      const urls = [];
      for (const name of names)
        for (const r of await (await caches.open(name)).keys()) urls.push(r.url);
      return urls;
    });
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some((url) => url.includes('/api/'))).toBe(false);
  } finally {
    await context.close();
  }
});
test('desktop live page has readable data and no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, 'Admin');
  await page.goto('/admin/live');
  await expect(page.locator('.feed-status')).toHaveText(
    ['Source connected', 'Source connected', 'Source connected'],
    { timeout: 30000 },
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/live-desktop.png', fullPage: true });
});

test('all role pages fit a phone viewport', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  const overflowing = [];
  for (const role of Object.keys(routes)) {
    await login(page, role[0].toUpperCase() + role.slice(1));
    for (const route of routes[role]) {
      await page.goto('/' + role + '/' + route);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main .loading')).toHaveCount(0, { timeout: 30000 });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
        overflowing.push(role + '/' + route);
    }
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
  }
  expect(overflowing).toEqual([]);
});

test('a slow previous weather location cannot replace the new selection', async ({ page }) => {
  await login(page, 'Citizen');
  let releaseOld, markOldStarted;
  const oldStarted = new Promise((resolve) => {
    markOldStarted = resolve;
  });
  const gate = new Promise((resolve) => {
    releaseOld = resolve;
  });
  await page.route('**/api/live/weather?**', async (route) => {
    const code = new URL(route.request().url()).searchParams.get('stateCode');
    if (code === 'DL') {
      markOldStarted();
      await gate;
    }
    try {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'AVAILABLE',
          fetchedAt: new Date().toISOString(),
          data: {
            current: {
              time: Math.floor(Date.now() / 1000),
              temperature_2m: code === 'TN' ? 19 : 25,
            },
          },
        }),
      });
    } catch {
      /* Aborted superseded request has no consumer. */
    }
  });
  await page.goto('/citizen/live');
  await oldStarted;
  await page.getByLabel('State / union territory').selectOption('TN');
  await expect(page.locator('.temperature strong')).toContainText('19');
  releaseOld();
  await page.getByRole('button', { name: 'Refresh feeds' }).click();
  await expect(page.locator('.temperature strong')).toContainText('19');
});
