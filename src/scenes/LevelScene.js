import * as PIXI from 'pixi.js';
import { PHASES, TILE_SIZE, TILE_TYPES, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import GameState from '../game/GameState.js';
import Player from '../game/Player.js';
import DungeonMap from '../game/DungeonMap.js';
import GemManager from '../game/GemManager.js';
import HUD from '../game/HUD.js';
import DungeonGenerator from '../dungeon/DungeonGenerator.js';
import CoverageRunner from '../coverage/CoverageRunner.js';
import CoverageTracker from '../coverage/CoverageTracker.js';
import CoverageMapper from '../coverage/CoverageMapper.js';
import Camera from '../engine/Camera.js';
import CodeModal from '../ui/CodeModal.js';
import InputModal from '../ui/InputModal.js';
import BranchModal from '../ui/BranchModal.js';
import levels from '../levels/index.js';

export default class LevelScene {
  constructor(sceneManager, spriteManager) {
    this.sceneManager = sceneManager;
    this.spriteManager = spriteManager;
    this.container = new PIXI.Container();
    this.worldContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();

    this.gameState = new GameState();
    this.dungeonGenerator = new DungeonGenerator();
    this.coverageRunner = new CoverageRunner();
    this.coverageTracker = new CoverageTracker();
    this.coverageMapper = new CoverageMapper();

    this.player = null;
    this.dungeonMap = null;
    this.gemManager = null;
    this.hud = null;
    this.codeModal = null;
    this.camera = null;
    this.inputModal = new InputModal();
    this.branchModal = new BranchModal();

    this.currentLayout = null;
    this.levelData = null;

    // Animation state
    this.coveredGemPositions = new Set(); // "x,y" keys of covered gem tiles
    this.walkFinished = false;

    // Branch pause state
    this.paused = false;
    this.savedWalkPath = null;
    this.branchResults = new Map(); // branchId → true/false
    this.coverageData = null;
  }

  async enter(data = {}) {
    this.container.removeChildren();
    this.worldContainer.removeChildren();
    this.uiContainer.removeChildren();

    // If replaying, don't reset coverage tracker
    if (!data._replay) {
      const levelIndex = data.levelIndex != null ? data.levelIndex : 0;
      this.levelData = levels[levelIndex];
      this.gameState.reset();
      this.gameState.currentLevel = levelIndex;
      this.coverageTracker.reset();
    }

    this._startRun();

    this.container.addChild(this.worldContainer);
    this.container.addChild(this.uiContainer);
  }

  _startRun() {
    this.worldContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.worldContainer.scale.set(1);

    this.gameState.startNewRun();
    this.coveredGemPositions = new Set();
    this.walkFinished = false;
    this.paused = false;
    this.savedWalkPath = null;
    this.branchResults = new Map();
    this.coverageData = null;

    // Generate dungeon from source
    this.currentLayout = this.dungeonGenerator.generate(
      this.levelData.source,
      this.levelData.fnName
    );

    // Create dungeon map
    this.dungeonMap = new DungeonMap(this.spriteManager);
    this.dungeonMap.loadFromLayout(this.currentLayout);
    this.worldContainer.addChild(this.dungeonMap.getContainer());

    // Create gem manager
    this.gemManager = new GemManager(this.spriteManager);
    const previouslyCollected = this.coverageTracker.getPreviouslyCollectedGems(
      this.currentLayout.gems
    );
    this.gemManager.placeGems(this.currentLayout.gems, previouslyCollected);
    this.gameState.totalGems = this.currentLayout.gems.length - previouslyCollected.size;
    this.worldContainer.addChild(this.gemManager.getContainer());

    // Create player at entry
    this.player = new Player(this.spriteManager);
    this.player.setPosition(this.currentLayout.entry.x, this.currentLayout.entry.y);
    this.worldContainer.addChild(this.player.getContainer());

    // Camera
    this.camera = new Camera(this.worldContainer);
    this.camera.snapTo(this.currentLayout.entry.x, this.currentLayout.entry.y);

    // HUD
    this.hud = new HUD();
    this.hud.onCodeButton = () => {
      if (this.codeModal.visible) {
        this.codeModal.hide();
      } else {
        this.codeModal.show(this.levelData.source, this.levelData.name);
      }
    };
    this.hud.onRunButton = () => {
      if (this.gameState.phase === PHASES.SETUP) {
        this._showInputModal();
      }
    };
    this.uiContainer.addChild(this.hud.getContainer());

    // Code modal
    this.codeModal = new CodeModal();
    this.uiContainer.addChild(this.codeModal.getContainer());

    this.gameState.setPhase(PHASES.SETUP);

    // Show input modal
    this._showInputModal();
  }

  _showInputModal() {
    const paramNames = this.coverageRunner.extractParamNames(
      this.levelData.source,
      this.levelData.fnName
    );

    // Build param hints from level data or fallback to names-only
    const paramHints = paramNames.map(name => {
      const levelParam = this.levelData.params?.find(p => p.name === name);
      if (levelParam) return levelParam;
      return { name, type: '', placeholder: '' };
    });

    this.inputModal.show(paramHints, (values) => {
      this._executeWithInputs(values);
    });
  }

  async _executeWithInputs(values) {
    this.gameState.setPhase(PHASES.EXECUTING);

    // Execute the function with user-provided values as stubs
    const { coverageData } = await this.coverageRunner.execute(
      this.levelData.source,
      this.levelData.fnName,
      values
    );

    if (coverageData) {
      this.coverageData = coverageData;

      // Precompute branch results from coverage data
      this._precomputeBranchResults(coverageData);

      // Track coverage
      this.coverageTracker.addRun(coverageData);

      // Map coverage to gems
      this.coverageMapper.buildMapping(
        coverageData,
        this.currentLayout.gems,
        this.currentLayout.tileData
      );

      const coveredGems = this.coverageMapper.getCoveredGemIds(coverageData);

      // Build set of covered gem positions for pickup during walk
      this.coveredGemPositions = new Set();
      const gemWaypoints = [];
      for (const gemId of coveredGems) {
        const gem = this.gemManager.gems.get(gemId);
        if (gem && !gem.ghost) {
          this.coveredGemPositions.add(`${gem.x},${gem.y}`);
          gemWaypoints.push({ x: gem.x, y: gem.y });
        }
      }

      // Sort waypoints by Y then X (top-to-bottom execution order)
      gemWaypoints.sort((a, b) => a.y - b.y || a.x - b.x);

      // Build full walk path: entry → gem1 → gem2 → ... using BFS
      const fullPath = this._buildWalkPath(gemWaypoints);

      if (fullPath.length > 0) {
        this.player.setWalkPath(fullPath);
        this.walkFinished = false;
        // Collect gem at the starting tile if covered
        this._collectGemAtPlayer();
        this.gameState.setPhase(PHASES.ANIMATING);
      } else {
        // No path — go straight to results
        this._finishRun();
      }
    } else {
      // No coverage data — skip animation, go straight to results
      this._finishRun();
    }
  }

  _buildWalkPath(gemWaypoints) {
    const path = [];
    let curX = this.player.gridX;
    let curY = this.player.gridY;

    for (const wp of gemWaypoints) {
      if (wp.x === curX && wp.y === curY) continue; // already there

      const segment = this._bfs(curX, curY, wp.x, wp.y);
      if (segment) {
        // Skip the first tile of each segment (it's the current position)
        for (let i = 1; i < segment.length; i++) {
          path.push(segment[i]);
        }
        curX = wp.x;
        curY = wp.y;
      }
    }

    return path;
  }

  _bfs(sx, sy, ex, ey) {
    if (sx === ex && sy === ey) return [{ x: sx, y: sy }];

    const queue = [{ x: sx, y: sy }];
    const visited = new Set();
    const parent = new Map();
    visited.add(`${sx},${sy}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      if (x === ex && y === ey) {
        // Reconstruct path
        const path = [];
        let key = `${ex},${ey}`;
        while (key) {
          const [px, py] = key.split(',').map(Number);
          path.unshift({ x: px, y: py });
          key = parent.get(key);
        }
        return path;
      }

      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx;
        const ny = y + dy;
        const nkey = `${nx},${ny}`;
        if (!visited.has(nkey) && this.dungeonMap.isWalkable(nx, ny)) {
          visited.add(nkey);
          parent.set(nkey, `${x},${y}`);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    return null; // No path found
  }

  _updateAnimating(delta) {
    // If paused for a branch modal, don't update player
    if (this.paused) {
      this.camera.update();
      return;
    }

    const arrivedAtTile = this.player.update();

    if (arrivedAtTile) {
      this._collectGemAtPlayer();

      // Check if hero landed on a BRANCH tile
      const tileType = this.dungeonMap.getTileType(this.player.gridX, this.player.gridY);
      if (tileType === TILE_TYPES.BRANCH) {
        const branch = this.dungeonMap.getBranchAt(this.player.gridX, this.player.gridY);
        if (branch) {
          this._pauseForBranch(branch);
        }
      }
    }

    // Camera follows player
    this.camera.follow(this.player.gridX, this.player.gridY);
    this.camera.update();

    // Check if walk is done
    if (!this.player.isMoving() && !this.walkFinished && !this.paused) {
      // Collect gem on the final tile
      this._collectGemAtPlayer();
      this.walkFinished = true;
      // Dim uncovered gems after a brief pause
      setTimeout(() => {
        this.gemManager.dimUncovered();
        this._finishRun();
      }, 400);
    }
  }

  _collectGemAtPlayer() {
    const key = `${this.player.gridX},${this.player.gridY}`;
    if (this.coveredGemPositions.has(key)) {
      const gemId = this.gemManager.getGemAt(this.player.gridX, this.player.gridY);
      if (gemId != null) {
        this.gemManager.collectGem(gemId);
        this.gameState.collectGem(gemId);
      }
    }
  }

  _precomputeBranchResults(coverageData) {
    this.branchResults = new Map();
    if (!coverageData || !coverageData.b) return;

    // Istanbul's b map: branchMap key → [trueCount, falseCount]
    // Match coverage branches to layout branches by source location
    for (const branch of this.currentLayout.branches) {
      if (branch.isTryCatch) continue; // skip try/catch branches

      // Try to match by location against istanbul's branchMap
      const result = this._matchBranchToCoverage(branch, coverageData);
      if (result !== null) {
        this.branchResults.set(branch.id, result);
      }
    }
  }

  _matchBranchToCoverage(branch, coverageData) {
    if (!coverageData.branchMap || !coverageData.b) return null;

    // Match by comparing source locations
    for (const [key, branchInfo] of Object.entries(coverageData.branchMap)) {
      if (branchInfo.type === 'if') {
        // Compare locations - istanbul uses 1-based lines
        const covLoc = branchInfo.loc;
        const branchLoc = branch.loc;

        if (covLoc && branchLoc &&
            covLoc.start.line === branchLoc.start.line &&
            covLoc.start.column === branchLoc.start.column) {
          const counts = coverageData.b[key];
          if (counts && counts.length >= 2) {
            // counts[0] = consequent (true), counts[1] = alternate (false)
            return counts[0] > 0; // true if the true branch was taken
          }
        }
      }
    }

    // Fallback: try matching by line number only
    for (const [key, branchInfo] of Object.entries(coverageData.branchMap)) {
      if (branchInfo.type === 'if') {
        const covLoc = branchInfo.loc;
        const branchLoc = branch.loc;
        if (covLoc && branchLoc && covLoc.start.line === branchLoc.start.line) {
          const counts = coverageData.b[key];
          if (counts && counts.length >= 2) {
            return counts[0] > 0;
          }
        }
      }
    }

    return null;
  }

  _pauseForBranch(branch) {
    // Save remaining walk path
    this.savedWalkPath = this.player.walkPath.slice();
    this.player.walkPath = [];
    this.player.walking = false;
    this.paused = true;

    // Get condition text and result
    const conditionText = this._getConditionText(branch);
    const result = this.branchResults.get(branch.id);

    // If we couldn't determine the result, try inferring from walk path direction
    let displayResult = result;
    if (displayResult === null || displayResult === undefined) {
      displayResult = this._inferBranchDirection(branch);
    }

    this.branchModal.show(conditionText, displayResult, () => {
      // Resume walking
      this.paused = false;
      if (this.savedWalkPath && this.savedWalkPath.length > 0) {
        this.player.setWalkPath(this.savedWalkPath);
        this.savedWalkPath = null;
      }
    });
  }

  _inferBranchDirection(branch) {
    // Look at the saved walk path to determine which direction the hero will go
    if (!this.savedWalkPath || this.savedWalkPath.length === 0) return true;

    // Find the first waypoint that diverges horizontally from the branch tile
    for (const wp of this.savedWalkPath) {
      if (wp.x !== branch.x) {
        // Check if it's heading toward truePath (left) or falsePath (right)
        if (branch.truePath && branch.falsePath) {
          const distTrue = Math.abs(wp.x - branch.truePath.col);
          const distFalse = Math.abs(wp.x - branch.falsePath.col);
          return distTrue <= distFalse;
        }
        break;
      }
    }

    return true; // default to true if can't determine
  }

  _getConditionText(branch) {
    if (!branch.condition) return 'condition';

    // Try to extract from source code using loc
    const loc = branch.condition.loc || branch.loc;
    if (loc && this.levelData.source) {
      const lines = this.levelData.source.split('\n');
      const startLine = loc.start.line - 1; // 0-indexed
      const endLine = loc.end.line - 1;

      if (startLine >= 0 && startLine < lines.length) {
        if (startLine === endLine) {
          // Single-line condition
          const line = lines[startLine];
          return line.substring(loc.start.column, loc.end.column);
        } else {
          // Multi-line: grab from start to end
          let text = lines[startLine].substring(loc.start.column);
          for (let i = startLine + 1; i < endLine; i++) {
            text += ' ' + lines[i].trim();
          }
          text += ' ' + lines[endLine].substring(0, loc.end.column);
          return text.trim();
        }
      }
    }

    // Fallback: reconstruct from AST node
    return this._conditionToString(branch.condition);
  }

  _conditionToString(node) {
    if (!node) return '?';
    switch (node.type) {
      case 'BinaryExpression':
        return `${this._conditionToString(node.left)} ${node.operator} ${this._conditionToString(node.right)}`;
      case 'LogicalExpression':
        return `${this._conditionToString(node.left)} ${node.operator} ${this._conditionToString(node.right)}`;
      case 'UnaryExpression':
        return `${node.operator}${this._conditionToString(node.argument)}`;
      case 'Identifier':
        return node.name;
      case 'NumericLiteral':
      case 'NumberLiteral':
        return String(node.value);
      case 'StringLiteral':
        return `"${node.value}"`;
      case 'BooleanLiteral':
        return String(node.value);
      case 'MemberExpression':
        return `${this._conditionToString(node.object)}.${node.property?.name || '?'}`;
      case 'CallExpression':
        return `${this._conditionToString(node.callee)}(...)`;
      default:
        return node.type;
    }
  }

  _finishRun() {
    // Update stats
    const stmtCov = this.coverageTracker.getStatementCoverage();
    const branchCov = this.coverageTracker.getBranchCoverage();
    this.gameState.updateCoverageStats(
      stmtCov.percent,
      branchCov.percent,
      stmtCov.covered,
      stmtCov.total
    );

    this.gameState.setPhase(PHASES.RESULTS);
    this.sceneManager.switchTo('result', {
      gameState: this.gameState,
      levelScene: this,
      coverageTracker: this.coverageTracker,
    });
  }

  update(delta) {
    if (!this.dungeonMap) return;

    switch (this.gameState.phase) {
      case PHASES.SETUP:
        // Idle — waiting for input modal
        break;
      case PHASES.EXECUTING:
        // Waiting for async coverage execution
        break;
      case PHASES.ANIMATING:
        this._updateAnimating(delta);
        break;
      case PHASES.RESULTS:
        // Handled by result scene
        break;
    }

    this.gemManager.update(delta);
    this.hud.update(this.gameState);
  }

  replayLevel() {
    this._startRun();
  }

  exit() {
    // Clean up modals if visible
    this.inputModal.hide();
    this.branchModal.hide();
  }

  getContainer() {
    return this.container;
  }
}
