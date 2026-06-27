# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Landing Page >> language chips visible
- Location: tests\kiosk.spec.js:31:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - region "Voice navigation" [ref=e4]:
      - button "Start voice navigation" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - generic [ref=e9]:
      - generic [ref=e11]:
        - generic [ref=e12]:
          - img [ref=e14]
          - generic [ref=e20]:
            - generic [ref=e21]: SUVIDHA
            - generic [ref=e22]: Smart Urban Helpdesk
        - generic [ref=e23] [cursor=pointer]: 3 Jun · 11:07
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]: WELCOME · স্বাগতম · स्वागत है
          - generic [ref=e27]:
            - text: How may we
            - text: help you
            - text: today?
          - generic [ref=e28]:
            - text: आज हम आपकी क्या
            - text: सहायता कर सकते हैं?
        - generic [ref=e30]:
          - button "Citizen Login AADHAAR Full access with Aadhaar verification" [ref=e31] [cursor=pointer]:
            - img [ref=e33]
            - generic [ref=e37]:
              - generic [ref=e38]:
                - text: Citizen Login
                - generic [ref=e39]: AADHAAR
              - generic [ref=e40]: Full access with Aadhaar verification
            - img [ref=e41]
          - button "Guest Browse services without login" [ref=e44] [cursor=pointer]:
            - img [ref=e46]
            - generic [ref=e50]:
              - generic [ref=e51]: Guest
              - generic [ref=e52]: Browse services without login
            - img [ref=e53]
        - 'button "Blind user: hold Aadhaar card to camera for hands-free login" [ref=e57] [cursor=pointer]':
          - img [ref=e58]
          - text:  Blind / Hands-free — Hold Aadhaar to Camera
        - generic [ref=e64]:
          - generic [ref=e65]: AVAILABLE IN 24 LANGUAGES · TAP TO CHANGE
          - generic [ref=e66]:
            - button "हिंदी" [ref=e67] [cursor=pointer]
            - button "English" [ref=e68] [cursor=pointer]
            - button "தமிழ்" [ref=e69] [cursor=pointer]
            - button "తెలుగు" [ref=e70] [cursor=pointer]
            - button "ಕನ್ನಡ" [ref=e71] [cursor=pointer]
            - button "অসমীয়া" [ref=e72] [cursor=pointer]
            - button "+17 more" [ref=e73] [cursor=pointer]
      - generic [ref=e74]:
        - button "Increase text size" [ref=e75] [cursor=pointer]:
          - img [ref=e76]
          - text: A+ Larger
        - button "Toggle voice-first blind mode" [ref=e79] [cursor=pointer]:
          - img [ref=e80]
          - text: Voice mode
        - button "Toggle voice instructions" [ref=e84] [cursor=pointer]:
          - img [ref=e85]
          - text: Voice On
        - button "EMERGENCY" [ref=e89] [cursor=pointer]:
          - img [ref=e90]
          - text: EMERGENCY
  - status [ref=e94]
```

# Test source

```ts
  1   | /**
  2   |  * SUVIDHA Kiosk — Complete Automated Test Suite
  3   |  * Tests all flows on 55" vertical kiosk viewport (1080×1920)
  4   |  * Run: npx playwright test
  5   |  */
  6   | 
  7   | import { test, expect } from '@playwright/test';
  8   | 
  9   | const SS = (name) => ({ path: `test-results/screenshots/${name}.png` });
  10  | 
  11  | test.beforeAll(async () => {
  12  |   const { mkdirSync } = await import('fs');
  13  |   mkdirSync('test-results/screenshots', { recursive: true });
  14  | });
  15  | 
  16  | // ── 1. LANDING PAGE ──────────────────────────────────────────────────────────
  17  | test.describe('Landing Page', () => {
  18  |   test('loads and shows 3 org options', async ({ page }) => {
  19  |     await page.goto('/');
  20  |     await page.waitForLoadState('networkidle');
  21  |     await page.screenshot(SS('01-landing'));
  22  | 
  23  |     // Check SUVIDHA branding
  24  |     await expect(page.getByText('SUVIDHA')).toBeVisible();
  25  | 
  26  |     // Check login options visible
  27  |     await expect(page.getByText(/Citizen Login|Aadhaar/i)).toBeVisible();
  28  |     await expect(page.getByText(/Guest|Continue as Guest/i)).toBeVisible();
  29  |   });
  30  | 
  31  |   test('language chips visible', async ({ page }) => {
  32  |     await page.goto('/');
> 33  |     await page.waitForLoadState('networkidle');
      |                ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
  34  |     // Check language options exist
  35  |     const langChips = page.locator('.chip, [class*="chip"]');
  36  |     const count = await langChips.count();
  37  |     expect(count).toBeGreaterThan(2);
  38  |     await page.screenshot(SS('01b-landing-languages'));
  39  |   });
  40  | });
  41  | 
  42  | // ── 2. LOGIN FLOW ────────────────────────────────────────────────────────────
  43  | test.describe('Login Flow', () => {
  44  |   test('Aadhaar login tab visible', async ({ page }) => {
  45  |     await page.goto('/login');
  46  |     await page.waitForLoadState('networkidle');
  47  |     await page.screenshot(SS('02-login'));
  48  |     await expect(page.getByText(/Aadhaar/i)).toBeVisible();
  49  |     await expect(page.getByText(/CA Number|Legacy/i)).toBeVisible();
  50  |   });
  51  | 
  52  |   test('guest login navigates to language select', async ({ page }) => {
  53  |     await page.goto('/');
  54  |     await page.waitForLoadState('networkidle');
  55  |     const guestBtn = page.getByText(/Guest|Continue as Guest/i).first();
  56  |     await guestBtn.click();
  57  |     await page.waitForURL(/language-select|home/);
  58  |     await page.screenshot(SS('02b-after-guest-login'));
  59  |   });
  60  | });
  61  | 
  62  | // ── 3. HOME — ORG SELECTION ──────────────────────────────────────────────────
  63  | test.describe('Home — Organisation Selection', () => {
  64  |   test('shows Electricity, Gas, Municipal', async ({ page }) => {
  65  |     await page.goto('/home');
  66  |     await page.waitForLoadState('networkidle');
  67  |     await page.screenshot(SS('03-home'));
  68  |     await expect(page.getByText(/Electricity/i)).toBeVisible();
  69  |     await expect(page.getByText(/Gas/i)).toBeVisible();
  70  |     await expect(page.getByText(/Municipal/i)).toBeVisible();
  71  |   });
  72  | 
  73  |   test('clicking Electricity navigates to electricity menu', async ({ page }) => {
  74  |     await page.goto('/home');
  75  |     await page.waitForLoadState('networkidle');
  76  |     await page.getByText(/Electricity/i).first().click();
  77  |     await page.waitForURL(/electricity/);
  78  |     await page.screenshot(SS('03b-electricity-menu'));
  79  |   });
  80  | 
  81  |   test('clicking Gas navigates to gas menu', async ({ page }) => {
  82  |     await page.goto('/home');
  83  |     await page.waitForLoadState('networkidle');
  84  |     await page.getByText(/Gas/i).first().click();
  85  |     await page.waitForURL(/gas/);
  86  |     await page.screenshot(SS('03c-gas-menu'));
  87  |   });
  88  | 
  89  |   test('clicking Municipal navigates to municipal menu', async ({ page }) => {
  90  |     await page.goto('/home');
  91  |     await page.waitForLoadState('networkidle');
  92  |     await page.getByText(/Municipal/i).first().click();
  93  |     await page.waitForURL(/municipal/);
  94  |     await page.screenshot(SS('03d-municipal-menu'));
  95  |   });
  96  | });
  97  | 
  98  | // ── 4. ELECTRICITY MODULE ────────────────────────────────────────────────────
  99  | test.describe('Electricity Module', () => {
  100 |   test('electricity menu shows all 6 services', async ({ page }) => {
  101 |     await page.goto('/electricity-menu');
  102 |     await page.waitForLoadState('networkidle');
  103 |     await page.screenshot(SS('04-electricity-menu'));
  104 |     await expect(page.getByText(/New Connection|Load Extension/i)).toBeVisible();
  105 |     await expect(page.getByText(/Meter/i)).toBeVisible();
  106 |     await expect(page.getByText(/Complaint/i)).toBeVisible();
  107 |     await expect(page.getByText(/Track/i)).toBeVisible();
  108 |     await expect(page.getByText(/Receipt/i)).toBeVisible();
  109 |   });
  110 | 
  111 |   test('new connection form loads', async ({ page }) => {
  112 |     await page.goto('/electricity?category=newConnection');
  113 |     await page.waitForLoadState('networkidle');
  114 |     await page.screenshot(SS('04b-electricity-new-connection'));
  115 |     // Should show a form
  116 |     const inputs = page.locator('input, select');
  117 |     const count = await inputs.count();
  118 |     expect(count).toBeGreaterThan(0);
  119 |   });
  120 | 
  121 |   test('electricity complaint — 5 categories visible', async ({ page }) => {
  122 |     await page.goto('/electricity/complaint');
  123 |     await page.waitForLoadState('networkidle');
  124 |     await page.screenshot(SS('04c-electricity-complaint'));
  125 |     await expect(page.getByText(/Incorrect|Bill/i)).toBeVisible();
  126 |     await expect(page.getByText(/Disconnection/i)).toBeVisible();
  127 |   });
  128 | 
  129 |   test('track status page works', async ({ page }) => {
  130 |     await page.goto('/track-status');
  131 |     await page.waitForLoadState('networkidle');
  132 |     await page.screenshot(SS('04d-track-status'));
  133 |     await expect(page.getByText(/Track|Request ID/i)).toBeVisible();
```