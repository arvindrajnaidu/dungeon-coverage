import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Load a page with just Babel standalone
await page.setContent(`
  <html><body>
  <script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
  <script>
    window.__babelInfo = {
      keys: Object.keys(Babel).sort(),
      hasPackages: !!Babel.packages,
      packagesKeys: Babel.packages ? Object.keys(Babel.packages) : [],
    };
  </script>
  </body></html>
`);

await page.waitForTimeout(5000);
const info = await page.evaluate(() => window.__babelInfo);
console.log('Babel 7.26.4:', JSON.stringify(info, null, 2));

await browser.close();
