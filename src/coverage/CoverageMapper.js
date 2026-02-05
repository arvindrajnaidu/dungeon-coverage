// CoverageMapper: maps coverage hits → dungeon tile gems
// Maps istanbul coverage data to gem positions in the dungeon layout

export default class CoverageMapper {
  constructor() {
    this.mapping = new Map(); // statementId (istanbul) → gemId (layout)
  }

  buildMapping(coverageData, gemPlacements, tileData) {
    this.mapping.clear();

    if (!coverageData || !coverageData.statementMap) {
      console.log('[CoverageMapper] No statementMap in coverage data');
      return;
    }

    console.log('[CoverageMapper] Building mapping...');
    console.log('[CoverageMapper] Istanbul statements:', Object.keys(coverageData.statementMap).length);
    console.log('[CoverageMapper] Gem placements:', gemPlacements.length);

    // Match istanbul statements to gems by source line/column.
    for (const [istId, istLoc] of Object.entries(coverageData.statementMap)) {
      let bestGem = null;
      let bestDist = Infinity;

      for (const gem of gemPlacements) {
        if (!gem.loc) continue;

        // Exact line+column match
        if (gem.loc.start.line === istLoc.start.line &&
            gem.loc.start.column === istLoc.start.column) {
          bestGem = gem;
          break;
        }

        // Fallback: match by line only (pick closest column)
        if (gem.loc.start.line === istLoc.start.line) {
          const dist = Math.abs(gem.loc.start.column - istLoc.start.column);
          if (dist < bestDist) {
            bestDist = dist;
            bestGem = gem;
          }
        }
      }

      if (bestGem) {
        this.mapping.set(istId, bestGem.id);
        console.log(`[CoverageMapper] Mapped Istanbul ${istId} (line ${istLoc.start.line}:${istLoc.start.column}) -> Gem ${bestGem.id} (line ${bestGem.loc.start.line}:${bestGem.loc.start.column})`);
      } else {
        console.log(`[CoverageMapper] No gem match for Istanbul ${istId} (line ${istLoc.start.line}:${istLoc.start.column})`);
      }
    }

    console.log('[CoverageMapper] Total mappings:', this.mapping.size);
  }

  getCoveredGemIds(coverageData) {
    const covered = new Set();
    if (!coverageData || !coverageData.s) {
      console.log('[CoverageMapper] No statement coverage data');
      return covered;
    }

    console.log('[CoverageMapper] Getting covered gem IDs...');
    for (const [stmtId, count] of Object.entries(coverageData.s)) {
      if (count > 0) {
        const gemId = this.mapping.get(stmtId);
        if (gemId) {
          covered.add(gemId);
          console.log(`[CoverageMapper] Statement ${stmtId} (count=${count}) -> Gem ${gemId}`);
        } else {
          console.log(`[CoverageMapper] Statement ${stmtId} (count=${count}) has no gem mapping`);
        }
      }
    }
    console.log('[CoverageMapper] Total covered gems:', covered.size);
    return covered;
  }

  getUncoveredGemIds(coverageData) {
    const uncovered = new Set();
    if (!coverageData || !coverageData.s) return uncovered;

    for (const [stmtId, count] of Object.entries(coverageData.s)) {
      if (count === 0) {
        const gemId = this.mapping.get(stmtId);
        if (gemId) uncovered.add(gemId);
      }
    }
    return uncovered;
  }
}
