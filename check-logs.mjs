import { chromium } from 'playwright';

const logs = [];
const errors = [];
const networkErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  logs.push(`[${msg.type()}] ${msg.text()}`);
});

page.on('pageerror', err => {
  errors.push(`[PAGE ERROR] ${err.message}`);
});

page.on('requestfailed', req => {
  networkErrors.push(`[NET FAIL] ${req.url()} - ${req.failure()?.errorText}`);
});

try {
  console.log('Navigating to http://localhost:5180/ ...');
  await page.goto('http://localhost:5180/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check what Babel looks like
  const babelCheck = await page.evaluate(() => {
    return {
      babelDefined: typeof Babel !== 'undefined',
      babelType: typeof Babel,
      babelKeys: typeof Babel !== 'undefined' ? Object.keys(Babel).slice(0, 20) : [],
      packagesType: typeof Babel !== 'undefined' ? typeof Babel.packages : 'N/A',
      packagesKeys: typeof Babel !== 'undefined' && Babel.packages ? Object.keys(Babel.packages) : [],
      maineffectDefined: typeof window.maineffect !== 'undefined',
      maineffectType: typeof window.maineffect,
      maineffectKeys: typeof window.maineffect === 'object' ? Object.keys(window.maineffect).slice(0, 10) : [],
    };
  });
  console.log('\n=== BABEL CHECK ===');
  console.log(JSON.stringify(babelCheck, null, 2));

  await page.screenshot({ path: '/Users/arvindnaidu/myws/dungeon-coverage/screenshot.png', fullPage: true });

  const canvasCount = await page.locator('canvas').count();
  console.log(`\nCanvas elements found: ${canvasCount}`);

  console.log(`\n=== CONSOLE LOGS (${logs.length}) ===`);
  for (const log of logs) console.log(log);

  if (networkErrors.length > 0) {
    console.log(`\n=== NETWORK ERRORS (${networkErrors.length}) ===`);
    for (const err of networkErrors) console.log(err);
  }

  if (errors.length > 0) {
    console.log(`\n=== PAGE ERRORS (${errors.length}) ===`);
    for (const err of errors) console.log(err);
  } else {
    console.log('\n=== NO PAGE ERRORS ===');
  }
} catch (e) {
  console.error('Error:', e.message);
  console.log(`\nLogs: ${logs.length}, Errors: ${errors.length}, Net: ${networkErrors.length}`);
  for (const log of logs) console.log(log);
  for (const err of errors) console.log(err);
  for (const ne of networkErrors) console.log(ne);
} finally {
  await browser.close();
}
