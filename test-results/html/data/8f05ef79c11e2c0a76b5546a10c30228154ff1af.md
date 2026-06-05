# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.js >> Login Flow >> Aadhaar login tab visible
- Location: tests\kiosk.spec.js:44:3

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
        - generic [ref=e23]:
          - button "Back" [ref=e24] [cursor=pointer]:
            - img [ref=e25]
            - text: Back
          - button "English" [ref=e28] [cursor=pointer]:
            - img [ref=e29]
            - text: English
          - button "Help" [ref=e34] [cursor=pointer]:
            - img [ref=e35]
            - text: Help
      - status [ref=e40]:
        - generic [ref=e41]:
          - img [ref=e43]
          - generic [ref=e48]:
            - generic [ref=e49]: Guwahati · Partly cloudy
            - generic [ref=e50]:
              - text: 31°C
              - generic [ref=e51]: feels 33°
        - generic "Air quality 211, Poor." [ref=e52]:
          - img [ref=e54]
          - generic [ref=e58]:
            - generic [ref=e59]: AIR QUALITY · CPCB
            - generic [ref=e60]: 211 Poor
        - generic [ref=e61]:
          - img [ref=e63]
          - generic [ref=e67]:
            - generic [ref=e68]: Wed, 3 Jun
            - generic [ref=e69]: 11:08
        - generic "Online" [ref=e70]:
          - img [ref=e72]
      - generic [ref=e78]:
        - generic [ref=e79]:
          - button "Aadhaar" [pressed] [ref=e80] [cursor=pointer]
          - button "CA Number / Legacy" [ref=e81] [cursor=pointer]
          - button "Consumer ID" [ref=e82] [cursor=pointer]
        - generic [ref=e83]:
          - img [ref=e85]
          - heading "Aadhaar Verification" [level=1] [ref=e89]
          - paragraph [ref=e90]: Enter your 12-digit Aadhaar number
        - generic [ref=e104]:
          - button "Digit 1" [ref=e105] [cursor=pointer]: "1"
          - button "Digit 2" [ref=e106] [cursor=pointer]: "2"
          - button "Digit 3" [ref=e107] [cursor=pointer]: "3"
          - button "Digit 4" [ref=e108] [cursor=pointer]: "4"
          - button "Digit 5" [ref=e109] [cursor=pointer]: "5"
          - button "Digit 6" [ref=e110] [cursor=pointer]: "6"
          - button "Digit 7" [ref=e111] [cursor=pointer]: "7"
          - button "Digit 8" [ref=e112] [cursor=pointer]: "8"
          - button "Digit 9" [ref=e113] [cursor=pointer]: "9"
          - button "Delete" [ref=e114] [cursor=pointer]: ⌫
          - button "Digit 0" [ref=e115] [cursor=pointer]: "0"
          - button "Submit" [ref=e116] [cursor=pointer]: ✓
        - generic [ref=e117]:
          - generic [ref=e118]: 🔒 Encrypted UIDAI lookup
          - generic [ref=e119]: Your data is used only for verification · DPDP Act 2023 compliant
      - generic [ref=e120]:
        - button "A+ Larger text" [ref=e121] [cursor=pointer]:
          - img [ref=e122]
          - text: A+ Larger text
        - button "Voice mode" [ref=e125] [cursor=pointer]:
          - img [ref=e126]
          - text: Voice mode
        - button "Turn voice instructions off" [pressed] [ref=e130] [cursor=pointer]:
          - img [ref=e131]
          - text: Voice On
        - button "EMERGENCY" [ref=e135] [cursor=pointer]:
          - img [ref=e136]
          - text: EMERGENCY
  - status [ref=e140]
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
  33  |     await page.waitForLoadState('networkidle');
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
> 46  |     await page.waitForLoadState('networkidle');
      |                ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
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
  134 | 
  135 |     // Test with demo ID
  136 |     const input = page.locator('input[placeholder*="SVD"], input[type="text"]').first();
  137 |     if (await input.isVisible()) {
  138 |       await input.fill('SVD-TEST-001');
  139 |       await page.keyboard.press('Enter');
  140 |       await page.waitForTimeout(2000);
  141 |       await page.screenshot(SS('04e-track-result'));
  142 |     }
  143 |   });
  144 | });
  145 | 
  146 | // ── 5. GAS MODULE ────────────────────────────────────────────────────────────
```