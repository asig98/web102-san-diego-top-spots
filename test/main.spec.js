const { test, expect } = require('@playwright/test');
const http = require('http');
const nodeStatic = require('node-static');

const PORT = 8888;
const url = `http://localhost:${PORT}/index.html`;

let server;

test.setTimeout(10000);

test.beforeAll(async () => {
  const fileServer = new nodeStatic.Server('./', { cache: 0 });
  server = http.createServer((req, res) => {
    req.addListener('end', () => {
      fileServer.serve(req, res);
    }).resume();
  });

  await new Promise(resolve => server.listen(PORT, resolve));
});

test.afterAll(() => {
  server.close();
});

test.describe('Server Setup', () => {
  test('should load successfully', async ({ request }) => {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
  });
});

test.describe('HTML', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('should have a hero H1 mentioning San Diego Top Spots', async ({ page }) => {
    const heading = page.locator('.hero h1');
    await expect(heading).toContainText('San Diego');
    await expect(heading).toContainText('Top Spots');
  });

  test('should load a page title mentioning San Diego Top Spots', async ({ page }) => {
    await expect(page).toHaveTitle(/San Diego Top Spots/);
  });

  test('should render the surprise-me compass button', async ({ page }) => {
    await expect(page.locator('#surprise-btn')).toBeVisible();
  });
});

test.describe('Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(url);
    await page.waitForSelector('.spot-card');
  });

  test('should render a card with the first spot\'s name', async ({ page }) => {
    const firstTitle = await page.locator('.spot-card .card-title').first().textContent();
    expect(firstTitle).toBe('Go For A Run In The San Diego Zoo Safari Park');
  });

  test('should render 30 spot cards on load', async ({ page }) => {
    await expect(page.locator('.spot-card')).toHaveCount(30);
  });

  test('should find a directions link with the correct map url', async ({ page }) => {
    const mapLink = await page.locator('.spot-card a.pill-btn-outline').first().getAttribute('href');
    expect(mapLink).toBe('https://www.google.com/maps?q=33.09745,-116.99572');
  });

  test('should filter cards when searching', async ({ page }) => {
    await page.fill('#search-input', 'ghost');
    await page.waitForTimeout(200);
    const count = await page.locator('.spot-card').count();
    expect(count).toBeGreaterThan(0);
    const titles = await page.locator('.spot-card .card-title').allTextContents();
    for (const title of titles) {
      const card = page.locator('.spot-card', { hasText: title });
      const text = (await card.textContent()).toLowerCase();
      expect(text).toContain('ghost');
    }
  });

  test('should toggle a spot into favorites', async ({ page }) => {
    await page.locator('.spot-card .fav-btn').first().click();
    await expect(page.locator('#favorites-count')).toHaveText('1');
  });

  test('should filter to favorites only when toggled', async ({ page }) => {
    await page.locator('.spot-card .fav-btn').first().click();
    await page.locator('#favorites-toggle').click();
    await expect(page.locator('.spot-card')).toHaveCount(1);
  });
});
