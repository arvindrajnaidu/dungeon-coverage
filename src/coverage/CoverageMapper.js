// CoverageMapper: maps coverage hits → dungeon tile gems
// Maps istanbul coverage data to gem positions in the dungeon layout

export default class CoverageMapper {
  constructor() {
    this.mapping = new Map(); // statementId (istanbul) → gemId (layout)
  }

  buildMapping(coverageData, gemPlacements, tileData) {
    this.mapping.clear();

    if (!coverageData || !coverageData.statementMap) return;

    // Match istanbul statements to gems by source line/column.
    // Istanbul counts control structures (if, switch, etc.) as statements,
    // but the layout engine gives those BRANCH tiles with no gem.
    // Sequential mapping breaks at the first control structure, so we
    // match by source location instead.

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
      }
    }
  }

  getCoveredGemIds(coverageData) {
    const covered = new Set();
    if (!coverageData || !coverageData.s) return covered;

    for (const [stmtId, count] of Object.entries(coverageData.s)) {
      if (count > 0) {
        const gemId = this.mapping.get(stmtId);
        if (gemId) covered.add(gemId);
      }
    }
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
