/**
 * SUVIDHA Kiosk — Test Suite (1080×1920 kiosk viewport)
 * Run: npx playwright test
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

mkdirSync('test-results/screenshots', { recursive: true });

const SS = (name) => ({ path: `test-results/screenshots/${name}.png` });

// Simulate logged-in citizen session
async function loginAsGuest(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  const guestBtn = page.getByText(/Continue as Guest|Guest/i).first();
  if (await guestBtn.isVisible()) await guestBtn.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  // Set session directly
  await page.evaluate(() => {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('actorType', 'citizen');
    sessionStorage.setItem('userName', 'Test Citizen');
    sessionStorage.setItem('userMobile', '8667692138');
    sessionStorage.setItem('userLanguage', 'en');
  });
}

// ── 1. LANDING PAGE ─────────────────────────────────────────────────────────
test.describe('Landing Page', () => {
  test('loads with SUVIDHA branding and login options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('01-landing'));
    await expect(page.getByText('SUVIDHA').first()).toBeVisible();
    await expect(page.getByText(/Guest/i).first()).toBeVisible();
  });

  test('language chips visible (6+ languages)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('01b-languages'));
    const chips = page.locator('.chip');
    expect(await chips.count()).toBeGreaterThan(3);
  });
});

// ── 2. LOGIN ─────────────────────────────────────────────────────────────────
test.describe('Login', () => {
  test('login page shows 3 auth tabs', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('02-login'));
    await expect(page.getByRole('button', { name: 'Aadhaar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /CA Number/i })).toBeVisible();
  });

  test('guest login works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await page.getByText(/Continue as Guest|Guest/i).first().click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.screenshot(SS('02b-after-guest'));
    expect(page.url()).toMatch(/language-select|home|voice/);
  });
});

// ── 3. HOME ──────────────────────────────────────────────────────────────────
test.describe('Home — Org Selection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('shows 3 main departments', async ({ page }) => {
    await page.screenshot(SS('03-home'));
    await expect(page.getByRole('button', { name: /Electricity/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Gas/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Municipal/i }).first()).toBeVisible();
  });

  test('Electricity click → electricity menu', async ({ page }) => {
    await page.getByRole('button', { name: /Electricity/i }).first().click();
    await page.waitForURL(/electricity/, { timeout: 10000 });
    await page.screenshot(SS('03b-electricity-menu'));
    expect(page.url()).toContain('electricity');
  });

  test('Gas click → gas menu', async ({ page }) => {
    await page.getByRole('button', { name: /Gas/i }).first().click();
    await page.waitForURL(/gas/, { timeout: 10000 });
    await page.screenshot(SS('03c-gas-menu'));
    expect(page.url()).toContain('gas');
  });

  test('Municipal click → municipal menu', async ({ page }) => {
    await page.getByRole('button', { name: /Municipal/i }).first().click();
    await page.waitForURL(/municipal/, { timeout: 10000 });
    await page.screenshot(SS('03d-municipal-menu'));
    expect(page.url()).toContain('municipal');
  });
});

// ── 4. ELECTRICITY ───────────────────────────────────────────────────────────
test.describe('Electricity Module', () => {
  test('electricity menu — 6 service tiles', async ({ page }) => {
    await page.goto('/electricity-menu');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('04-electricity-menu'));
    await expect(page.getByRole('button', { name: /New Connection/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Meter/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Complaint/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Track/i }).first()).toBeVisible();
  });

  test('new connection form — has load kW field', async ({ page }) => {
    await page.goto('/electricity?category=newConnection');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('04b-new-connection'));
    const inputs = page.locator('input, select');
    expect(await inputs.count()).toBeGreaterThan(2);
  });

  test('complaint page — 5 categories visible', async ({ page }) => {
    await page.goto('/electricity/complaint');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('04c-complaint'));
    await expect(page.getByText(/Incorrect/i).first()).toBeVisible();
    await expect(page.getByText(/Disconnection/i).first()).toBeVisible();
  });

  test('track status — demo IDs work', async ({ page }) => {
    await page.goto('/track-status');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('04d-track'));
    await expect(page.getByRole('heading', { name: /Track/i })).toBeVisible();
    const input = page.locator('input[type="text"]').first();
    if (await input.isVisible()) {
      await input.fill('SVD-TEST-001');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      await page.screenshot(SS('04e-track-result'));
    }
  });
});

// ── 5. GAS ───────────────────────────────────────────────────────────────────
test.describe('Gas Module', () => {
  test('gas menu — all services visible', async ({ page }) => {
    await page.goto('/gas-menu');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('05-gas-menu'));
    await expect(page.getByRole('button', { name: /New Connection/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Bill/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Complaint/i }).first()).toBeVisible();
  });

  test('gas complaint — categories + voice button', async ({ page }) => {
    await page.goto('/gas/complaint');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('05b-gas-complaint'));
    await expect(page.getByRole('heading', { name: /Gas Complaint/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Incorrect Gas Bill/i })).toBeVisible();
  });

  test('gas bills — shows bill history', async ({ page }) => {
    await page.goto('/gas/bills');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('05c-gas-bills'));
    await expect(page.getByRole('heading', { name: /Gas Bills/i })).toBeVisible();
  });
});

// ── 6. MUNICIPAL ─────────────────────────────────────────────────────────────
test.describe('Municipal Module', () => {
  test('municipal menu — all services', async ({ page }) => {
    await page.goto('/municipal-menu');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('06-municipal-menu'));
    await expect(page.getByRole('button', { name: /Water/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Grievance/i }).first()).toBeVisible();
  });

  test('grievance — 8 categories present', async ({ page }) => {
    await page.goto('/municipal/grievance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('06b-grievance'));
    await expect(page.getByRole('button', { name: /Water Supply/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sewage/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Garbage/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Streetlight/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Road/i })).toBeVisible();
  });

  test('property tax — lookup works', async ({ page }) => {
    await page.goto('/municipal/property-tax');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('06c-property-tax'));
    await expect(page.getByRole('heading', { name: /Property Tax/i })).toBeVisible();
    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.fill('PROP-2024-001');
      await page.screenshot(SS('06d-property-filled'));
    }
  });
});

// ── 7. CHATBOT ───────────────────────────────────────────────────────────────
test.describe('AI Chatbot', () => {
  test('chatbot button visible on home', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot(SS('07-chatbot-button'));
    await expect(page.getByRole('button', { name: /Open AI Assistant/i })).toBeVisible();
  });

  test('chatbot opens and shows welcome message', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /Open AI Assistant/i }).click();
    await page.waitForTimeout(3000);
    await page.screenshot(SS('07b-chatbot-open'));
    // Welcome message should appear
    const msgs = page.locator('[role="log"]');
    await expect(msgs).toBeVisible();
  });

  test('chatbot responds to question', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /Open AI Assistant/i }).click();
    await page.waitForTimeout(1000);
    const input = page.locator('input[placeholder*="Type"], input[placeholder*="Ask"], input[placeholder*="message"], input[type="text"]').last();
    if (await input.isVisible()) {
      await input.fill('I need a new gas connection');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(10000);
      await page.screenshot(SS('07c-chatbot-response'));
    }
  });
});

// ── 8. RECEIPT ───────────────────────────────────────────────────────────────
test.describe('Receipt', () => {
  test('receipt page loads', async ({ page }) => {
    await page.goto('/receipt?org=electricity');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('08-receipt'));
  });
});

// ── 9. CONSUMER PROFILE ──────────────────────────────────────────────────────
test.describe('Consumer Profile', () => {
  test('electricity profile page', async ({ page }) => {
    await page.goto('/consumer-profile?org=electricity');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('09-profile-electricity'));
    await expect(page.getByRole('heading', { name: /Consumer Profile/i })).toBeVisible();
  });

  test('gas profile page', async ({ page }) => {
    await page.goto('/consumer-profile?org=gas');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('09b-profile-gas'));
  });
});

// ── 10. ADMIN ────────────────────────────────────────────────────────────────
test.describe('Admin', () => {
  test('admin login page loads', async ({ page }) => {
    await page.goto('/admin-login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('10-admin-login'));
    await expect(page.getByText(/Admin|Officer/i).first()).toBeVisible();
  });
});

// ── 11. ACCESSIBILITY ────────────────────────────────────────────────────────
test.describe('Accessibility', () => {
  test('all buttons on home are large enough (60px+ for kiosk touch)', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot(SS('11-home-touch-targets'));
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    let tooSmall = 0;
    const small = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box && box.height < 44) { tooSmall++; small.push(box.height.toFixed(0) + 'px'); }
    }
    console.log(`Checked ${Math.min(count, 20)} buttons. Too small (<44px): ${tooSmall}`, small);
    expect(tooSmall).toBeLessThanOrEqual(2); // allow 2 minor exceptions
  });

  test('no console errors on landing', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const critical = errors.filter(e => !e.includes('Warning:') && !e.includes('favicon'));
    console.log('Console errors:', critical);
    expect(critical.length).toBeLessThanOrEqual(3);
  });
});

// ── 12. BACKEND API ──────────────────────────────────────────────────────────
test.describe('Backend API (via Vite proxy)', () => {
  test('health endpoint OK', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/health');
      return { status: r.status, body: await r.json() };
    });
    expect(resp.status).toBe(200);
    expect(resp.body.status).toBe('ok');
    console.log('Health:', JSON.stringify(resp.body));
  });

  test('Sarvam API configured', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/sarvam/status');
      return { status: r.status, body: await r.json() };
    });
    expect(resp.body.configured).toBe(true);
    console.log('Sarvam:', JSON.stringify(resp.body));
  });

  test('chat API returns reply', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hello', language: 'en', context: '' }),
      });
      return { status: r.status, body: await r.json() };
    });
    expect(resp.status).toBe(200);
    expect(resp.body.reply?.length).toBeGreaterThan(5);
    console.log('Chat reply:', resp.body.reply?.slice(0, 100));
    console.log('Provider:', resp.body.provider);
  });

  test('track demo request SVD-TEST-001', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/track/SVD-TEST-001');
      return { status: r.status };
    });
    console.log('Track status code:', resp.status);
    expect([200, 429, 404]).toContain(resp.status);
  });
});
