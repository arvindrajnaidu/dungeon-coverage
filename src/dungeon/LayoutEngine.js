// LayoutEngine: CFG → 2D tile grid
// Top-down recursive layout placing tiles for corridors, branches, loops, etc.

import { TILE_TYPES } from '../constants.js';
import { NODE_TYPES } from './CFGBuilder.js';

const MIN_WIDTH = 3; // minimum width for a path

export function layoutCFG(cfgRoot) {
  const tiles = [];
  const tileData = [];
  const branches = [];
  const gemPlacements = [];
  let statementCounter = 0;

  // First pass: estimate widths
  function estimateWidth(node) {
    if (!node) return MIN_WIDTH;

    switch (node.type) {
      case NODE_TYPES.ROOT:
        return Math.max(MIN_WIDTH, ...node.children.map(estimateWidth));

      case NODE_TYPES.BLOCK:
        return MIN_WIDTH;

      case NODE_TYPES.RETURN:
        return MIN_WIDTH;

      case NODE_TYPES.BRANCH: {
        const leftW = estimateWidth(node.consequent);
        const rightW = estimateWidth(node.alternate);
        return leftW + rightW + 1; // +1 for center column gap
      }

      case NODE_TYPES.SWITCH: {
        let total = 0;
        for (const c of node.cases) {
          total += estimateWidth(c.body);
        }
        return Math.max(total + node.cases.length - 1, MIN_WIDTH);
      }

      case NODE_TYPES.LOOP:
        return Math.max(estimateWidth(node.body) + 2, MIN_WIDTH + 2); // +2 for loop-back corridor

      case NODE_TYPES.TRY: {
        const tryW = estimateWidth(node.tryBody);
        const catchW = estimateWidth(node.catchBody);
        return tryW + catchW + 1;
      }

      default:
        return MIN_WIDTH;
    }
  }

  const totalWidth = estimateWidth(cfgRoot);
  // Use totalWidth as startCol to ensure enough room for deeply nested left branches
  // This prevents negative column coordinates
  const startCol = totalWidth;

  // Ensure grid is wide enough
  function ensureGrid(maxRow, maxCol) {
    while (tiles.length <= maxRow) {
      tiles.push([]);
      tileData.push([]);
    }
    for (let r = 0; r <= maxRow; r++) {
      while (tiles[r].length <= maxCol) {
        tiles[r].push(TILE_TYPES.EMPTY);
        tileData[r].push(null);
      }
    }
  }

  function setTile(row, col, type, data = null) {
    if (row < 0 || col < 0) {
      console.warn(`[LayoutEngine] Attempted to set tile at negative position (${col}, ${row})`);
      return;
    }
    ensureGrid(row, col);
    tiles[row][col] = type;
    if (data) tileData[row][col] = data;
  }

  function getTile(row, col) {
    if (row < 0 || col < 0 || row >= tiles.length || col >= (tiles[row]?.length || 0)) {
      return TILE_TYPES.EMPTY;
    }
    return tiles[row][col];
  }

  // Place a corridor connecting (r1,c) to (r2,c) vertically
  function placeVerticalCorridor(col, r1, r2) {
    const start = Math.min(r1, r2);
    const end = Math.max(r1, r2);
    for (let r = start; r <= end; r++) {
      if (getTile(r, col) === TILE_TYPES.EMPTY) {
        setTile(r, col, TILE_TYPES.FLOOR);
      }
    }
  }

  // Place a horizontal corridor connecting (r, c1) to (r, c2)
  function placeHorizontalCorridor(row, c1, c2) {
    const start = Math.min(c1, c2);
    const end = Math.max(c1, c2);
    for (let c = start; c <= end; c++) {
      if (getTile(row, c) === TILE_TYPES.EMPTY) {
        setTile(row, c, TILE_TYPES.CORRIDOR_H);
      }
    }
  }

  // Recursive layout: returns the row after the last placed tile
  function layoutNode(node, row, col) {
    if (!node) return row;

    switch (node.type) {
      case NODE_TYPES.ROOT: {
        let currentRow = row;
        for (const child of node.children) {
          currentRow = layoutNode(child, currentRow, col);
        }
        return currentRow;
      }

      case NODE_TYPES.BLOCK: {
        let currentRow = row;
        for (const stmt of node.statements) {
          const stmtId = `s${statementCounter++}`;
          setTile(currentRow, col, TILE_TYPES.FLOOR, {
            statementId: stmtId,
            loc: stmt.loc,
            source: getStatementSource(stmt),
          });
          gemPlacements.push({ id: stmtId, x: col, y: currentRow, statementId: stmtId, loc: stmt.loc });
          currentRow++;
        }
        return currentRow;
      }

      case NODE_TYPES.RETURN: {
        const stmtId = `s${statementCounter++}`;
        setTile(row, col, TILE_TYPES.EXIT, {
          statementId: stmtId,
          loc: node.loc,
          source: 'return',
        });
        gemPlacements.push({ id: stmtId, x: col, y: row, statementId: stmtId, loc: node.loc });
        return row + 1;
      }

      case NODE_TYPES.BRANCH: {
        const leftW = estimateWidth(node.consequent);
        const rightW = estimateWidth(node.alternate);
        const leftCenter = col - Math.floor(leftW / 2) - 1;
        const rightCenter = col + Math.floor(rightW / 2) + 1;

        // Place branch tile
        const branchId = `b${branches.length}`;
        setTile(row, col, TILE_TYPES.BRANCH, { branchId, condition: node.condition, loc: node.loc });

        // Horizontal corridor to left and right
        placeHorizontalCorridor(row + 1, leftCenter, col);
        placeHorizontalCorridor(row + 1, col, rightCenter);

        // Layout consequent (left/true) and alternate (right/false)
        const leftEnd = layoutNode(node.consequent, row + 2, leftCenter);
        const rightEnd = layoutNode(node.alternate, row + 2, rightCenter);

        // Merge point
        const mergeRow = Math.max(leftEnd, rightEnd) + 1;
        setTile(mergeRow, col, TILE_TYPES.MERGE);

        // Connect branches back to merge (start from last gem row to ensure connectivity)
        const leftCorridorStart = Math.max(row + 2, leftEnd - 1);
        const rightCorridorStart = Math.max(row + 2, rightEnd - 1);
        placeVerticalCorridor(leftCenter, leftCorridorStart, mergeRow);
        placeVerticalCorridor(rightCenter, rightCorridorStart, mergeRow);
        placeHorizontalCorridor(mergeRow, leftCenter, col);
        placeHorizontalCorridor(mergeRow, col, rightCenter);

        // Store branch info for game decisions
        branches.push({
          id: branchId,
          x: col,
          y: row,
          condition: node.condition,
          loc: node.loc,
          truePath: { col: leftCenter, startRow: row + 2 },
          falsePath: { col: rightCenter, startRow: row + 2 },
          trueEndRow: leftEnd,
          falseEndRow: rightEnd,
          mergeRow,
        });

        return mergeRow + 1;
      }

      case NODE_TYPES.SWITCH: {
        const caseCount = node.cases.length;
        if (caseCount === 0) return row + 1;

        const caseWidths = node.cases.map(c => estimateWidth(c.body));
        const totalW = caseWidths.reduce((a, b) => a + b, 0) + caseCount - 1;
        let caseStartCol = col - Math.floor(totalW / 2);

        // Place switch branch tile
        const branchId = `b${branches.length}`;
        setTile(row, col, TILE_TYPES.BRANCH, {
          branchId,
          condition: node.discriminant,
          loc: node.loc,
          isSwitch: true,
        });

        const caseEnds = [];
        const caseCenters = [];

        for (let i = 0; i < caseCount; i++) {
          const caseCenter = caseStartCol + Math.floor(caseWidths[i] / 2);
          caseCenters.push(caseCenter);
          placeHorizontalCorridor(row + 1, col, caseCenter);
          const caseEnd = layoutNode(node.cases[i].body, row + 2, caseCenter);
          caseEnds.push(caseEnd);
          caseStartCol += caseWidths[i] + 1;
        }

        const mergeRow = Math.max(...caseEnds) + 1;
        setTile(mergeRow, col, TILE_TYPES.MERGE);

        for (let i = 0; i < caseCount; i++) {
          // Start corridor from last gem row (caseEnds[i] - 1) to ensure connectivity
          const corridorStart = Math.max(row + 2, caseEnds[i] - 1);
          placeVerticalCorridor(caseCenters[i], corridorStart, mergeRow);
          placeHorizontalCorridor(mergeRow, caseCenters[i], col);
        }

        branches.push({
          id: branchId,
          x: col,
          y: row,
          condition: node.discriminant,
          loc: node.loc,
          isSwitch: true,
          cases: caseCenters.map((c, i) => ({
            col: c,
            startRow: row + 2,
            test: node.cases[i].test,
          })),
          mergeRow,
        });

        return mergeRow + 1;
      }

      case NODE_TYPES.LOOP: {
        // Place loop entry
        const stmtId = `s${statementCounter++}`;
        setTile(row, col, TILE_TYPES.FLOOR, {
          statementId: stmtId,
          isLoopEntry: true,
          condition: node.condition,
          loc: node.loc,
          source: 'loop',
        });
        gemPlacements.push({ id: stmtId, x: col, y: row, statementId: stmtId, loc: node.loc });

        // Layout loop body
        const bodyEnd = layoutNode(node.body, row + 1, col);

        // Loop-back tile
        setTile(bodyEnd, col + 1, TILE_TYPES.LOOP_BACK);
        placeVerticalCorridor(col + 1, row, bodyEnd);
        setTile(row, col + 1, TILE_TYPES.CORRIDOR_H);

        // Add corridor from loop body to exit (connects to code after loop)
        // This ensures there's a walkable path from inside the loop to after it
        placeVerticalCorridor(col, row, bodyEnd + 1);

        return bodyEnd + 1;
      }

      case NODE_TYPES.TRY: {
        const tryW = estimateWidth(node.tryBody);
        const catchW = estimateWidth(node.catchBody);
        const tryCenter = col;
        const catchCenter = col + Math.floor(tryW / 2) + Math.floor(catchW / 2) + 2;

        // Try body
        const tryEnd = layoutNode(node.tryBody, row, tryCenter);

        // Catch entry
        setTile(row, catchCenter, TILE_TYPES.CATCH_ENTRY);
        placeHorizontalCorridor(row, tryCenter, catchCenter);

        // Catch body
        const catchEnd = layoutNode(node.catchBody, row + 1, catchCenter);

        // Merge after try/catch (start corridors from last gem row)
        const mergeRow = Math.max(tryEnd, catchEnd) + 1;
        setTile(mergeRow, col, TILE_TYPES.MERGE);
        const tryCorridorStart = Math.max(row, tryEnd - 1);
        const catchCorridorStart = Math.max(row + 1, catchEnd - 1);
        placeVerticalCorridor(tryCenter, tryCorridorStart, mergeRow);
        placeVerticalCorridor(catchCenter, catchCorridorStart, mergeRow);
        placeHorizontalCorridor(mergeRow, tryCenter, catchCenter);

        // Store as a branch for game decisions
        const branchId = `b${branches.length}`;
        branches.push({
          id: branchId,
          x: tryCenter,
          y: row,
          isTryCatch: true,
          loc: node.loc,
          truePath: { col: tryCenter, startRow: row },
          falsePath: { col: catchCenter, startRow: row + 1 },
          mergeRow,
        });

        return mergeRow + 1;
      }

      default:
        return row;
    }
  }

  // Place entry tile
  setTile(0, startCol, TILE_TYPES.ENTRY);
  const endRow = layoutNode(cfgRoot, 1, startCol);

  // Place final exit if not already there
  let hasExit = false;
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < (tiles[r]?.length || 0); c++) {
      if (tiles[r][c] === TILE_TYPES.EXIT) {
        hasExit = true;
        break;
      }
    }
    if (hasExit) break;
  }
  if (!hasExit) {
    setTile(endRow, startCol, TILE_TYPES.EXIT, { source: 'end' });
  }

  // Normalize grid - ensure all rows have the same length
  const maxWidth = Math.max(...tiles.map(r => r.length));
  for (let r = 0; r < tiles.length; r++) {
    while (tiles[r].length < maxWidth) {
      tiles[r].push(TILE_TYPES.EMPTY);
      tileData[r].push(null);
    }
  }

  // Add padding around the grid for walls
  const finalHeight = tiles.length + 2;
  const finalWidth = maxWidth + 2;

  // Create padded grid
  const paddedTiles = [];
  const paddedTileData = [];

  // Add empty top row
  paddedTiles.push(new Array(finalWidth).fill(TILE_TYPES.EMPTY));
  paddedTileData.push(new Array(finalWidth).fill(null));

  // Add existing rows with padding on left and right
  for (let r = 0; r < tiles.length; r++) {
    const newRow = [TILE_TYPES.EMPTY, ...tiles[r], TILE_TYPES.EMPTY];
    const newDataRow = [null, ...tileData[r], null];
    paddedTiles.push(newRow);
    paddedTileData.push(newDataRow);
  }

  // Add empty bottom row
  paddedTiles.push(new Array(finalWidth).fill(TILE_TYPES.EMPTY));
  paddedTileData.push(new Array(finalWidth).fill(null));

  // Update gem positions to account for padding (+1 to x and y)
  for (const gem of gemPlacements) {
    gem.x += 1;
    gem.y += 1;
  }

  // Update branch positions
  for (const branch of branches) {
    branch.x += 1;
    branch.y += 1;
    if (branch.truePath) {
      branch.truePath.col += 1;
      branch.truePath.startRow += 1;
    }
    if (branch.falsePath) {
      branch.falsePath.col += 1;
      branch.falsePath.startRow += 1;
    }
    if (branch.mergeRow !== undefined) branch.mergeRow += 1;
    if (branch.trueEndRow !== undefined) branch.trueEndRow += 1;
    if (branch.falseEndRow !== undefined) branch.falseEndRow += 1;
    if (branch.cases) {
      for (const c of branch.cases) {
        c.col += 1;
        c.startRow += 1;
      }
    }
  }

  // Fill empty cells adjacent to walkable cells with walls
  for (let r = 0; r < paddedTiles.length; r++) {
    for (let c = 0; c < paddedTiles[r].length; c++) {
      if (paddedTiles[r][c] === TILE_TYPES.EMPTY) {
        // Check if adjacent to any walkable tile
        const neighbors = [
          [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
          [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < paddedTiles.length && nc >= 0 && nc < paddedTiles[nr].length) {
            if (paddedTiles[nr][nc] !== TILE_TYPES.EMPTY && paddedTiles[nr][nc] !== TILE_TYPES.WALL) {
              paddedTiles[r][c] = TILE_TYPES.WALL;
              break;
            }
          }
        }
      }
    }
  }

  // Find entry and exit positions (adjusted for padding)
  let entry = { x: startCol + 1, y: 1 };
  let exit = { x: startCol + 1, y: endRow + 1 };
  for (let r = 0; r < paddedTiles.length; r++) {
    for (let c = 0; c < paddedTiles[r].length; c++) {
      if (paddedTiles[r][c] === TILE_TYPES.ENTRY) entry = { x: c, y: r };
      if (paddedTiles[r][c] === TILE_TYPES.EXIT) exit = { x: c, y: r };
    }
  }

  // Trim the grid to just the used area + 1 tile padding
  const trimResult = trimGrid(paddedTiles, paddedTileData, gemPlacements, branches, entry, exit);

  return {
    grid: trimResult.grid,
    tileData: trimResult.tileData,
    entry: trimResult.entry,
    exit: trimResult.exit,
    branches: trimResult.branches,
    gems: trimResult.gems,
    width: trimResult.grid[0]?.length || 0,
    height: trimResult.grid.length,
  };
}

function trimGrid(tiles, tileData, gems, branches, entry, exit) {
  // Find bounding box of non-empty tiles
  let minRow = tiles.length, maxRow = 0;
  let minCol = tiles[0]?.length || 0, maxCol = 0;

  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[r].length; c++) {
      if (tiles[r][c] !== TILE_TYPES.EMPTY) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  // Add 1 tile padding around the bounding box
  const padding = 1;
  minRow = Math.max(0, minRow - padding);
  maxRow = Math.min(tiles.length - 1, maxRow + padding);
  minCol = Math.max(0, minCol - padding);
  maxCol = Math.min((tiles[0]?.length || 1) - 1, maxCol + padding);

  // Crop the grid
  const croppedTiles = [];
  const croppedTileData = [];
  for (let r = minRow; r <= maxRow; r++) {
    croppedTiles.push(tiles[r].slice(minCol, maxCol + 1));
    croppedTileData.push(tileData[r].slice(minCol, maxCol + 1));
  }

  // Update positions by subtracting the offset
  const offsetX = minCol;
  const offsetY = minRow;

  // Update gems
  for (const gem of gems) {
    gem.x -= offsetX;
    gem.y -= offsetY;
  }

  // Update branches
  for (const branch of branches) {
    branch.x -= offsetX;
    branch.y -= offsetY;
    if (branch.truePath) {
      branch.truePath.col -= offsetX;
      branch.truePath.startRow -= offsetY;
    }
    if (branch.falsePath) {
      branch.falsePath.col -= offsetX;
      branch.falsePath.startRow -= offsetY;
    }
    if (branch.mergeRow !== undefined) branch.mergeRow -= offsetY;
    if (branch.trueEndRow !== undefined) branch.trueEndRow -= offsetY;
    if (branch.falseEndRow !== undefined) branch.falseEndRow -= offsetY;
    if (branch.cases) {
      for (const c of branch.cases) {
        c.col -= offsetX;
        c.startRow -= offsetY;
      }
    }
  }

  // Update entry and exit
  const newEntry = { x: entry.x - offsetX, y: entry.y - offsetY };
  const newExit = { x: exit.x - offsetX, y: exit.y - offsetY };

  return {
    grid: croppedTiles,
    tileData: croppedTileData,
    gems,
    branches,
    entry: newEntry,
    exit: newExit,
  };
}

function getStatementSource(stmt) {
  if (!stmt) return '';
  switch (stmt.type) {
    case 'ExpressionStatement':
      return getExprSource(stmt.expression);
    case 'VariableDeclaration':
      return `${stmt.kind} ${stmt.declarations.map(d => d.id?.name || '?').join(', ')}`;
    case 'ReturnStatement':
      return 'return';
    case 'ThrowStatement':
      return 'throw';
    case 'BreakStatement':
      return 'break';
    case 'ContinueStatement':
      return 'continue';
    default:
      return stmt.type;
  }
}

function getExprSource(expr) {
  if (!expr) return '';
  switch (expr.type) {
    case 'CallExpression':
      return `${getExprSource(expr.callee)}(...)`;
    case 'MemberExpression':
      return `${getExprSource(expr.object)}.${expr.property?.name || '?'}`;
    case 'Identifier':
      return expr.name;
    case 'AssignmentExpression':
      return `${getExprSource(expr.left)} = ...`;
    case 'AwaitExpression':
      return `await ${getExprSource(expr.argument)}`;
    default:
      return expr.type;
  }
}
