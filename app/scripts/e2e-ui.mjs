// Browser smoke test of the real UI against the local stack.
//   npm run stack:up && npm run dev   (in another terminal)
//   node scripts/e2e-ui.mjs [screenshotDir]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = process.argv[2] ?? 'e2e-screenshots';
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const APP = 'http://localhost:5173';
const stamp = Date.now() % 100000;
const USER = { email: `demo${stamp}@dreamland.test`, password: 'Demo-pass-123' };

// Create a user and make them owner (local stack only)
const res = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: env.LOCAL_SERVICE_KEY, authorization: `Bearer ${env.LOCAL_SERVICE_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({ ...USER, email_confirm: true, user_metadata: { full_name: 'Raja Demo' } }),
});
const { id } = await res.json();
execSync(`docker exec dl-db psql -U postgres -qc "update public.profiles set role='owner' where id='${id}'"`);

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless: true });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && !/favicon|icon-192/.test(m.text()) && errors.push(`console: ${m.text()}`));
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const step = (s) => console.log(`• ${s}`);

step('login');
await page.goto(`${APP}/login`);
await shot('01-login');
await page.getByLabel('Email').fill(USER.email);
await page.getByLabel('Password').fill(USER.password);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByText('Outstanding').waitFor();
await page.waitForTimeout(600);
await shot('02-dashboard-mobile');

step('add car');
await page.goto(`${APP}/cars/new`);
const carNo = `RIC-${stamp}`.slice(0, 12);
await page.getByLabel('Car number').fill(carNo);
await page.getByLabel('Make').fill('Toyota');
await page.getByLabel('Model').fill('Yaris ATIV');
await page.getByLabel('Year').fill('2023');
await page.getByLabel('Color').fill('Grey');
await page.getByLabel('Standard rent').fill('60000');
await shot('03-add-car');
await page.getByRole('button', { name: 'Add car' }).last().click();
await page.getByRole('button', { name: 'Send to maintenance' }).waitFor();
await shot('04-car-detail');
const carUrl = page.url();

step('car out wizard');
await page.getByRole('link', { name: 'Car Out' }).first().click();
await page.getByRole('button', { name: 'New customer' }).click();
await page.getByLabel('Full name').fill('Ali Khan');
await page.getByLabel('Mobile').fill('0321 5551234');
await page.getByLabel('License number').fill('ISB-99887');
await shot('05-carout-driver');
await page.getByRole('button', { name: 'Next' }).click();
await page.getByLabel('Guarantor name').fill('Imran Shah');
await page.getByLabel('Guarantor mobile').fill('03335554321');
await page.getByRole('button', { name: 'Next' }).click();
await page.getByLabel('Agreed total rent').waitFor();
await page.getByLabel(/Agreed rate/).fill('55000');
await shot('06-carout-terms');
await page.getByRole('button', { name: 'Next' }).click();
await page.getByLabel('Advance received').fill('10000');
await page.getByRole('radio', { name: 'Cash' }).first().click();
await page.getByLabel('Security deposit taken').fill('20000');
await page.getByRole('radio', { name: 'Bank Transfer' }).last().click();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Confirm Car Out' }).waitFor();
await shot('07-carout-review');
await page.getByRole('button', { name: 'Confirm Car Out' }).click();
await page.getByRole('link', { name: 'Return car' }).waitFor();
await page.waitForTimeout(500);
await shot('08-rental-detail');

step('record payment');
await page.getByRole('button', { name: 'Add payment' }).click();
await page.getByRole('dialog').getByLabel('Amount', { exact: true }).fill('15000');
await page.getByRole('dialog').getByRole('radio', { name: 'Mobile Wallet' }).click();
await shot('09-payment-sheet');
await page.getByRole('button', { name: 'Save payment' }).click();
await page.getByText('Payment saved').waitFor();
const pendingText = await page.locator('text=Pending').first().locator('..').innerText();
if (!pendingText.includes('30,000')) errors.push(`expected pending Rs 30,000, got: ${pendingText}`);

step('car return');
await page.getByRole('link', { name: 'Return car' }).click();
await page.getByLabel('Damage charge').fill('3000');
await page.getByLabel('Damage notes').fill('Side mirror');
await page.getByLabel('Use deposit toward bill').fill('3000');
await page.getByRole('button', { name: /^Fill Rs/ }).click();
await page.getByRole('radio', { name: 'Cash' }).first().click();
await page.getByRole('button', { name: /^Return Rs/ }).click();
await page.getByRole('radio', { name: 'Cash' }).last().click();
await shot('10-return');
await page.getByRole('button', { name: /Confirm return/ }).click();
await page.getByText(/rental closed/).waitFor();
await page.waitForTimeout(400);
await shot('11-rental-closed');
const badge = await page.getByText('Closed', { exact: true }).first().isVisible();
if (!badge) errors.push('rental not shown as Closed after full settlement');

step('reports & lists');
for (const [path, name] of [
  ['/reports/income?mode=month', '12-income'],
  ['/rentals', '13-rentals'],
  ['/cars', '14-cars'],
  ['/reports/outstanding', '15-outstanding'],
  ['/settings/audit-log', '16-audit'],
  ['/more', '17-more'],
]) {
  await page.goto(`${APP}${path}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await shot(name);
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
if (overflow) errors.push('horizontal scroll on mobile');

step('desktop');
await page.setViewportSize({ width: 1280, height: 860 });
await page.goto(`${APP}/`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
await shot('18-dashboard-desktop');
await page.goto(carUrl);
await page.waitForLoadState('networkidle');
await shot('19-car-desktop');

await browser.close();
if (errors.length) {
  console.error('\nFAILED:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`\nUI smoke test passed — screenshots in ${OUT}/`);
