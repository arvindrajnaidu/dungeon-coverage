// DungeonGenerator: orchestrator — source → CFG → layout → tile map
// Ties together CFGBuilder, LayoutEngine, and BranchAnalyzer

import { buildCFG } from './CFGBuilder.js';
import { layoutCFG } from './LayoutEngine.js';
import { analyzeBranch } from './BranchAnalyzer.js';
import { TILE_TYPES } from '../constants.js';

export default class DungeonGenerator {
  constructor() {
    this.lastCFG = null;
    this.lastLayout = null;
  }

  generate(sourceCode, fnName) {
    // Parse source with Babel standalone
    const ast = this._parseSource(sourceCode);
    if (!ast) {
      console.error('Failed to parse source code');
      return this._fallbackLayout();
    }

    // Build CFG from AST
    const cfg = buildCFG(ast);
    this.lastCFG = cfg;

    // Layout CFG to 2D grid
    const layout = layoutCFG(cfg);
    this.lastLayout = layout;

    // Analyze branches for decision options
    const branchDecisions = layout.branches.map(branch => {
      const analysis = analyzeBranch(branch.condition, branch);
      return {
        ...branch,
        ...analysis,
      };
    });

    return {
      ...layout,
      branches: branchDecisions,
    };
  }

  _parseSource(sourceCode) {
    try {
      const Babel = window.Babel;
      if (!Babel) {
        console.error('Babel not loaded');
        return null;
      }

      const result = Babel.transform(sourceCode, {
        ast: true,
        code: false,
        sourceType: 'module',
        presets: [],
        plugins: [],
      });

      return result.ast;
    } catch (e) {
      console.error('Parse error:', e);
      return null;
    }
  }

  _fallbackLayout() {
    // Simple straight corridor for error cases
    const grid = [];
    const tileData = [];
    for (let r = 0; r < 10; r++) {
      grid.push([]);
      tileData.push([]);
      for (let c = 0; c < 5; c++) {
        if (c === 2) {
          grid[r].push(r === 0 ? 6 : r === 9 ? 5 : 1); // ENTRY, EXIT, FLOOR
        } else {
          grid[r].push(c === 1 || c === 3 ? 2 : 0); // WALL or EMPTY
        }
        tileData[r].push(null);
      }
    }
    return {
      grid,
      tileData,
      entry: { x: 2, y: 0 },
      exit: { x: 2, y: 9 },
      branches: [],
      gems: [],
      width: 5,
      height: 10,
    };
  }
}
