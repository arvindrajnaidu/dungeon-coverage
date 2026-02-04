import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', msg => {
  const t = msg.text();
  if (t.includes('[TRACE]') || msg.type() === 'error') console.log('[' + msg.type() + '] ' + t);
});
page.on('pageerror', err => console.log('[PAGE ERROR] ' + err.message));

await page.goto('http://localhost:5180/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const result = await page.evaluate(async () => {
  const bc = window["@babel/core"];
  const originalTransform = bc.transform;

  // Intercept transform to see all options
  bc.transform = function(...args) {
    const opts = args[1] || {};
    console.log('[TRACE] transform called:', JSON.stringify({
      codeLen: typeof args[0] === 'string' ? args[0].length : 0,
      opts: {
        filename: opts.filename,
        sourceType: opts.sourceType,
        ast: opts.ast,
        code: opts.code,
        pluginCount: opts.plugins ? opts.plugins.length : 0,
      }
    }));

    const result = originalTransform.apply(this, args);

    console.log('[TRACE] transform result:', JSON.stringify({
      hasCode: !!result.code,
      codeLen: result.code ? result.code.length : 0,
      hasAst: !!result.ast,
      hasCoverage: result.code ? result.code.includes('__coverage__') : false,
    }));

    // If code was generated, show first 200 chars
    if (result.code) {
      console.log('[TRACE] generated code: ' + result.code.slice(0, 300));
    }

    return result;
  };

  const mod = await import('/src/coverage/CoverageRunner.js');
  const CoverageRunner = mod.default;
  const runner = new CoverageRunner();

  const source = `function checkValue(x) { return x > 10 ? 'big' : 'small'; }`;
  const res = await runner.execute(source, 'checkValue', { x: 15 });

  bc.transform = originalTransform;

  return {
    result: res.result,
    hasCoverage: !!res.coverageData,
  };
});

console.log('\nResult:', JSON.stringify(result));
await browser.close();
