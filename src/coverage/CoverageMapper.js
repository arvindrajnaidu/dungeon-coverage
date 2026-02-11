// CoverageMapper: maps coverage hits → dungeon tile gems
// Maps istanbul coverage data to gem positions in the dungeon layout

export default class CoverageMapper {
  constructor() {
    this.mapping = new Map(); // statementId (istanbul) → gemId (layout)
  }

  buildMapping(coverageData, gemPlacements, tileData) {
    this.mapping.clear();
    this.reverseMapping = new Map(); // gemId → istanbulId

    if (!coverageData || !coverageData.statementMap) {
      console.log('[CoverageMapper] No statementMap in coverage data');
      return;
    }

    console.log('[CoverageMapper] Building mapping...');
    console.log('[CoverageMapper] Istanbul statements:', Object.keys(coverageData.statementMap).length);
    console.log('[CoverageMapper] Gem placements:', gemPlacements.length);

    // First, log all gem locations for debugging
    console.log('[CoverageMapper] Gem locations:');
    for (const gem of gemPlacements) {
      if (gem.loc) {
        console.log(`  Gem ${gem.id}: line ${gem.loc.start.line}:${gem.loc.start.column}`);
      } else {
        console.log(`  Gem ${gem.id}: NO LOCATION DATA`);
      }
    }

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
        this.reverseMapping.set(bestGem.id, istId);
        console.log(`[CoverageMapper] Mapped Istanbul ${istId} (line ${istLoc.start.line}:${istLoc.start.column}) -> Gem ${bestGem.id}`);
      } else {
        console.log(`[CoverageMapper] No gem match for Istanbul ${istId} (line ${istLoc.start.line}:${istLoc.start.column})`);
      }
    }

    // Check for gems without mappings
    const unmappedGems = gemPlacements.filter(g => !this.reverseMapping.has(g.id));
    if (unmappedGems.length > 0) {
      console.warn('[CoverageMapper] UNMAPPED GEMS (no Istanbul statement):');
      for (const gem of unmappedGems) {
        console.warn(`  Gem ${gem.id} at line ${gem.loc?.start?.line || '?'}`);
      }
    }

    console.log('[CoverageMapper] Total mappings:', this.mapping.size);
    console.log('[CoverageMapper] Mapped gems:', this.reverseMapping.size, '/', gemPlacements.length);
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
