import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.setContent(`
  <html><body>
  <script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
  <script>
    function unwrap(mod) { return mod && mod.__esModule ? mod.default : mod; }
    var tpl = Babel.packages.template;
    window.__info = {
      templateType: typeof tpl,
      templateKeys: typeof tpl === 'object' ? Object.keys(tpl).slice(0, 20) : [],
      hasDefault: !!(tpl && tpl.default),
      defaultType: tpl && tpl.default ? typeof tpl.default : 'N/A',
      hasEsModule: !!(tpl && tpl.__esModule),
      unwrapped: typeof unwrap(tpl),
      // Try calling it
      isCallable: typeof tpl === 'function',
      defaultCallable: tpl && tpl.default ? typeof tpl.default === 'function' : false,
    };
  </script>
  </body></html>
`);

await page.waitForTimeout(3000);
const info = await page.evaluate(() => window.__info);
console.log('Template info:', JSON.stringify(info, null, 2));

await browser.close();
