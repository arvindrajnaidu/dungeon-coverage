import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const logs = [];
page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

await page.goto('http://localhost:5180/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

let passed = 0;
let failed = 0;

function report(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
    if (detail) console.log(`        ${detail}`);
  }
}

const SOURCE = `function checkValue(x) {
  const result = [];
  result.push('start');
  if (x > 10) {
    result.push('big');
    result.push('very big');
  } else {
    result.push('small');
  }
  result.push('end');
  return result;
}`;

console.log('\n=== CoverageRunner Unit Tests ===\n');

// ---- Test 1: Dependencies available ----
const deps = await page.evaluate(() => ({
  hasMaineffect: !!window.maineffect,
  hasParseFnStr: !!window.maineffect?.parseFnStr,
  hasBabelCore: !!window["@babel/core"],
}));
report('maineffect loaded', deps.hasMaineffect);
report('parseFnStr available', deps.hasParseFnStr);
report('babel core loaded', deps.hasBabelCore);

// ---- Test 2: maineffect executes without istanbul ----
const meBasic = await page.evaluate((src) => {
  const parsed = window.maineffect.parseFnStr('/test.js', src, { console }, { plugins: [] });
  const fn = parsed.find('checkValue');
  const result = fn.callWith(15);
  return { result, ok: Array.isArray(result) && result.includes('big') };
}, SOURCE);
report('maineffect executes function (no istanbul)', meBasic.ok,
  `result: ${JSON.stringify(meBasic.result)}`);

// ---- Test 3: CoverageRunner.execute() returns coverageData ----
const e2e = await page.evaluate(async (src) => {
  const mod = await import('/src/coverage/CoverageRunner.js?t=' + Date.now());
  const CoverageRunner = mod.default;
  const runner = new CoverageRunner();
  const res = await runner.execute(src, 'checkValue', { x: 15 });

  return {
    ready: runner.ready,
    result: res.result,
    hasCoverage: !!res.coverageData,
    error: res.error ? res.error.message : null,
    coverageData: res.coverageData,
    coverageKeys: Object.keys(window.__coverage__ || {}),
  };
}, SOURCE);

report('CoverageRunner.ready', e2e.ready);
report('execute() returns correct result', Array.isArray(e2e.result) && e2e.result.includes('big'),
  `result: ${JSON.stringify(e2e.result)}`);
report('__coverage__ populated on window', e2e.coverageKeys.length > 0,
  `keys: ${JSON.stringify(e2e.coverageKeys)}`);
report('execute() returns coverageData', e2e.hasCoverage,
  e2e.error ? `error: ${e2e.error}` : null);

// ---- Test 4: Coverage data has correct structure ----
if (e2e.hasCoverage) {
  const cd = e2e.coverageData;
  report('coverageData has statementMap', !!cd.statementMap);
  report('coverageData has branchMap', !!cd.branchMap);
  report('coverageData has s (statement hits)', !!cd.s);
  report('coverageData has b (branch hits)', !!cd.b);
  report('coverageData has f (function hits)', !!cd.f);

  const stmtHits = Object.values(cd.s);
  const hitCount = stmtHits.filter(v => v > 0).length;
  report('some statements were hit', hitCount > 0,
    `hit: ${hitCount}/${stmtHits.length}, s: ${JSON.stringify(cd.s)}`);

  const branchEntries = Object.values(cd.b);
  report('branch data present', branchEntries.length > 0);

  if (branchEntries.length > 0) {
    const firstBranch = branchEntries[0];
    report('true branch was taken (x=15 > 10)', firstBranch[0] > 0,
      `branch counts: ${JSON.stringify(firstBranch)}`);
    report('false branch was NOT taken', firstBranch[1] === 0,
      `branch counts: ${JSON.stringify(firstBranch)}`);
  }
}

// ---- Test 5: Coverage with x=5 (else branch) ----
const elseBranch = await page.evaluate(async (src) => {
  const mod = await import('/src/coverage/CoverageRunner.js?t=' + Date.now());
  const CoverageRunner = mod.default;
  const runner = new CoverageRunner();
  const res = await runner.execute(src, 'checkValue', { x: 5 });

  return {
    result: res.result,
    hasCoverage: !!res.coverageData,
    branchHits: res.coverageData?.b,
  };
}, SOURCE);

report('x=5: returns correct result', Array.isArray(elseBranch.result) && elseBranch.result.includes('small'),
  `result: ${JSON.stringify(elseBranch.result)}`);
report('x=5: coverage captured', elseBranch.hasCoverage);

if (elseBranch.hasCoverage && elseBranch.branchHits) {
  const firstBranch = Object.values(elseBranch.branchHits)[0];
  report('x=5: false branch taken', firstBranch && firstBranch[1] > 0,
    `branch counts: ${JSON.stringify(firstBranch)}`);
  report('x=5: true branch NOT taken', firstBranch && firstBranch[0] === 0,
    `branch counts: ${JSON.stringify(firstBranch)}`);
}

// ---- Test 6: CoverageMapper maps gems to correct branch side ----
const mappingTest = await page.evaluate(async (src) => {
  const CoverageRunnerMod = await import('/src/coverage/CoverageRunner.js?t=' + Date.now());
  const CoverageMapperMod = await import('/src/coverage/CoverageMapper.js?t=' + Date.now());
  const DungeonGeneratorMod = await import('/src/dungeon/DungeonGenerator.js?t=' + Date.now());

  const CoverageRunner = CoverageRunnerMod.default;
  const CoverageMapper = CoverageMapperMod.default;
  const DungeonGenerator = DungeonGeneratorMod.default;

  const runner = new CoverageRunner();
  const mapper = new CoverageMapper();
  const generator = new DungeonGenerator();

  // Generate dungeon layout
  const layout = generator.generate(src, 'checkValue');

  // Execute with x=15 (true branch)
  const res = await runner.execute(src, 'checkValue', { x: 15 });
  if (!res.coverageData) return { error: 'no coverage data' };

  // Build mapping
  mapper.buildMapping(res.coverageData, layout.gems, layout.tileData);

  // Get covered gem IDs
  const coveredIds = mapper.getCoveredGemIds(res.coverageData);
  const uncoveredIds = mapper.getUncoveredGemIds(res.coverageData);

  // Find the branch info
  const branch = layout.branches[0];
  const trueSide = branch?.truePath?.col;
  const falseSide = branch?.falsePath?.col;

  // Check which gems are on which side
  const coveredGems = [];
  const uncoveredGems = [];
  for (const gem of layout.gems) {
    if (coveredIds.has(gem.id)) {
      coveredGems.push({ id: gem.id, x: gem.x, y: gem.y });
    } else if (uncoveredIds.has(gem.id)) {
      uncoveredGems.push({ id: gem.id, x: gem.x, y: gem.y });
    }
  }

  // Check: no covered gem should be on the false branch side
  const coveredOnFalseSide = coveredGems.filter(g => g.x === falseSide);
  // Check: uncovered gems should include those on the false branch side
  const uncoveredOnFalseSide = uncoveredGems.filter(g => g.x === falseSide);

  return {
    totalGems: layout.gems.length,
    coveredCount: coveredIds.size,
    uncoveredCount: uncoveredIds.size,
    trueSide,
    falseSide,
    coveredGems,
    uncoveredGems,
    coveredOnFalseSide,
    uncoveredOnFalseSide,
  };
}, SOURCE);

if (mappingTest.error) {
  report('coverage mapping test', false, mappingTest.error);
} else {
  report('no covered gem on false branch (x=15)', mappingTest.coveredOnFalseSide.length === 0,
    `covered on false side (col=${mappingTest.falseSide}): ${JSON.stringify(mappingTest.coveredOnFalseSide)}`);
  report('false branch gem is uncovered (x=15)', mappingTest.uncoveredOnFalseSide.length > 0,
    `uncovered on false side: ${JSON.stringify(mappingTest.uncoveredOnFalseSide)}`);
  // With x=15: 7 gems total, 1 on false branch (uncovered), 6 covered.
  // Istanbul also counts the if-statement itself but it has no gem.
  report('covered gem count correct (x=15)', mappingTest.coveredCount === 6,
    `covered: ${mappingTest.coveredCount}/${mappingTest.totalGems}`);
}

// ---- Test 7: With x=5, only false branch gems are covered ----
const mappingElse = await page.evaluate(async (src) => {
  const CoverageRunnerMod = await import('/src/coverage/CoverageRunner.js?t=' + Date.now());
  const CoverageMapperMod = await import('/src/coverage/CoverageMapper.js?t=' + Date.now());
  const DungeonGeneratorMod = await import('/src/dungeon/DungeonGenerator.js?t=' + Date.now());

  const CoverageRunner = CoverageRunnerMod.default;
  const CoverageMapper = CoverageMapperMod.default;
  const DungeonGenerator = DungeonGeneratorMod.default;

  const runner = new CoverageRunner();
  const mapper = new CoverageMapper();
  const generator = new DungeonGenerator();

  const layout = generator.generate(src, 'checkValue');
  const res = await runner.execute(src, 'checkValue', { x: 5 });
  if (!res.coverageData) return { error: 'no coverage data' };

  mapper.buildMapping(res.coverageData, layout.gems, layout.tileData);
  const coveredIds = mapper.getCoveredGemIds(res.coverageData);

  const branch = layout.branches[0];
  const trueSide = branch?.truePath?.col;

  const coveredGems = [];
  for (const gem of layout.gems) {
    if (coveredIds.has(gem.id)) {
      coveredGems.push({ id: gem.id, x: gem.x, y: gem.y });
    }
  }

  const coveredOnTrueSide = coveredGems.filter(g => g.x === trueSide);

  return {
    coveredCount: coveredIds.size,
    trueSide,
    coveredOnTrueSide,
  };
}, SOURCE);

if (mappingElse.error) {
  report('coverage mapping test (x=5)', false, mappingElse.error);
} else {
  report('no covered gem on true branch (x=5)', mappingElse.coveredOnTrueSide.length === 0,
    `covered on true side (col=${mappingElse.trueSide}): ${JSON.stringify(mappingElse.coveredOnTrueSide)}`);
}

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

await browser.close();
process.exit(failed > 0 ? 1 : 0);
