import * as PIXI from 'pixi.js';
import { PHASES, TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
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
import WeaponSidebar from '../ui/WeaponSidebar.js';
import WeaponSlots from '../ui/WeaponSlots.js';
import SpriteManager from '../engine/SpriteManager.js';
import levels from '../levels/index.js';

export default class LevelScene {
  constructor(sceneManager, spriteManager, weaponInventory, soundManager = null) {
    this.sceneManager = sceneManager;
    this.spriteManager = spriteManager;
    this.weaponInventory = weaponInventory;
    this.soundManager = soundManager;
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

    // Weapon forge UI
    this.weaponSidebar = null;
    this.weaponSlots = null;

    // Drag state
    this.dragState = null; // { weaponId, sprite, active }

    this.currentLayout = null;
    this.levelData = null;

    // Animation state
    this.coveredGemPositions = new Set(); // "x,y" keys of covered gem tiles
    this.walkFinished = false;
    this.coverageData = null;

    // Bind stage drag handlers
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
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
    this.coverageData = null;
    this.dragState = null;

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
    this.gemManager = new GemManager(this.spriteManager, this.soundManager);

    // Get gems that were covered in previous runs
    const previouslyCollected = this._getPreviouslyCoveredGemIds();
    this.gemManager.placeGems(this.currentLayout.gems, previouslyCollected);
    this.gameState.totalGems = this.currentLayout.gems.length - previouslyCollected.size;
    this.worldContainer.addChild(this.gemManager.getContainer());

    // Create player at entry
    this.player = new Player(this.spriteManager, this.soundManager);
    this.player.setPosition(this.currentLayout.entry.x, this.currentLayout.entry.y);
    this.worldContainer.addChild(this.player.getContainer());

    // Camera
    this.camera = new Camera(this.worldContainer);
    this.camera.snapTo(this.currentLayout.entry.x, this.currentLayout.entry.y);

    // HUD
    this.hud = new HUD(this.soundManager);
    this.hud.onCodeButton = () => {
      if (this.codeModal.visible) {
        this.codeModal.hide();
      } else {
        this.codeModal.show(this.levelData.source, this.levelData.name);
      }
    };
    this.hud.onRunButton = () => {
      // No-op: Run is now handled by WeaponSlots
    };
    this.hud.onForgeButton = () => {
      if (this.gameState.phase === PHASES.SETUP) {
        this.sceneManager.switchTo('forge', { returnTo: 'level', levelIndex: this.gameState.currentLevel });
      }
    };
    this.uiContainer.addChild(this.hud.getContainer());

    // Code modal
    this.codeModal = new CodeModal();
    this.uiContainer.addChild(this.codeModal.getContainer());

    this.gameState.setPhase(PHASES.SETUP);

    // Setup weapon slots and sidebar
    this._showWeaponUI();
  }

  _showWeaponUI() {
    const paramNames = this.coverageRunner.extractParamNames(
      this.levelData.source,
      this.levelData.fnName
    );

    const paramHints = paramNames.map(name => {
      const levelParam = this.levelData.params?.find(p => p.name === name);
      if (levelParam) return levelParam;
      return { name, type: '', placeholder: '' };
    });

    // Create weapon slots positioned above the entry point
    this.weaponSlots = new WeaponSlots(this.spriteManager, this.soundManager);
    const entryX = this.currentLayout.entry.x;
    const entryY = this.currentLayout.entry.y;
    this.weaponSlots.setParams(paramHints, entryX, entryY);
    this.weaponSlots.onRun(() => {
      if (this.weaponSlots.allFilled()) {
        const values = this.weaponSlots.getValues();
        this._hideWeaponUI();
        this._executeWithInputs(values);
      }
    });
    this.worldContainer.addChild(this.weaponSlots);

    // Create weapon sidebar
    this.weaponSidebar = new WeaponSidebar(this.spriteManager, this.weaponInventory);
    this.weaponSidebar.onDragStart((weapon, e) => {
      this._startDrag(weapon, e);
    });
    this.weaponSidebar.show();
    this.uiContainer.addChild(this.weaponSidebar);

    // Enable stage-level pointer events for drag
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    this.container.on('pointermove', this._onPointerMove);
    this.container.on('pointerup', this._onPointerUp);
    this.container.on('pointerupoutside', this._onPointerUp);
  }

  _hideWeaponUI() {
    if (this.weaponSidebar) {
      this.weaponSidebar.hide();
    }
    if (this.weaponSlots) {
      this.weaponSlots.visible = false;
    }
    this._cancelDrag();
    this.container.off('pointermove', this._onPointerMove);
    this.container.off('pointerup', this._onPointerUp);
    this.container.off('pointerupoutside', this._onPointerUp);
  }

  // --- Drag & Drop ---

  _startDrag(weapon, e) {
    // Cancel any existing drag
    this._cancelDrag();

    const texKey = SpriteManager.textureKeyForType(weapon.type);
    const sprite = new PIXI.Sprite(this.spriteManager.getTexture(texKey));
    sprite.width = 32;
    sprite.height = 32;
    sprite.anchor.set(0.5);
    sprite.alpha = 0.85;

    const pos = e.data.getLocalPosition(this.container);
    sprite.x = pos.x;
    sprite.y = pos.y;

    this.container.addChild(sprite);

    this.dragState = {
      weaponId: weapon.id,
      sprite,
      active: true,
    };
  }

  _onPointerMove(e) {
    if (!this.dragState || !this.dragState.active) return;
    const pos = e.data.getLocalPosition(this.container);
    this.dragState.sprite.x = pos.x;
    this.dragState.sprite.y = pos.y;
  }

  _onPointerUp(e) {
    if (!this.dragState || !this.dragState.active) return;

    // Get position in world coordinates (accounting for camera offset)
    const pos = e.data.getLocalPosition(this.worldContainer);
    const slotIdx = this.weaponSlots.isOverSlot(pos.x, pos.y);

    if (slotIdx >= 0) {
      const weapon = this.weaponInventory.get(this.dragState.weaponId);
      if (weapon) {
        this.weaponSlots.dropWeapon(slotIdx, weapon);
      }
    }

    // Remove drag sprite
    this.container.removeChild(this.dragState.sprite);
    this.dragState.sprite.destroy();
    this.dragState = null;
  }

  _cancelDrag() {
    if (this.dragState) {
      this.container.removeChild(this.dragState.sprite);
      this.dragState.sprite.destroy();
      this.dragState = null;
    }
  }

  // --- Execution ---

  async _executeWithInputs(values) {
    this.gameState.setPhase(PHASES.EXECUTING);

    // Play run start sound
    if (this.soundManager) {
      this.soundManager.play('runStart');
    }

    // Execute the function with user-provided values as stubs
    const { coverageData } = await this.coverageRunner.execute(
      this.levelData.source,
      this.levelData.fnName,
      values
    );

    if (coverageData) {
      this.coverageData = coverageData;

      // Track coverage
      this.coverageTracker.addRun(coverageData);

      // Map coverage to gems
      this.coverageMapper.buildMapping(
        coverageData,
        this.currentLayout.gems,
        this.currentLayout.tileData
      );

      const coveredGems = this.coverageMapper.getCoveredGemIds(coverageData);

      // Build waypoints for ALL covered gems (hero walks the full execution path)
      // and track which ones can still be collected (not already green)
      this.coveredGemPositions = new Set();
      const gemWaypoints = [];
      for (const gemId of coveredGems) {
        const gem = this.gemManager.gems.get(gemId);
        if (gem) {
          // Hero walks through all covered gems
          gemWaypoints.push({ x: gem.x, y: gem.y });
          // Only mark for collection if not already collected
          if (!gem.collected) {
            this.coveredGemPositions.add(`${gem.x},${gem.y}`);
          }
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
    const arrivedAtTile = this.player.update();

    if (arrivedAtTile) {
      this._collectGemAtPlayer();
    }

    // Camera follows player
    this.camera.follow(this.player.gridX, this.player.gridY);
    this.camera.update();

    // Check if walk is done
    if (!this.player.isMoving() && !this.walkFinished) {
      // Collect gem on the final tile
      this._collectGemAtPlayer();
      this.walkFinished = true;

      // Mark all covered gems based on actual coverage data
      this._markCoveredGemsFromCoverage();

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

  _markCoveredGemsFromCoverage() {
    // Use the CoverageMapper to get covered gem IDs
    const coveredGemIds = this.coverageMapper.getCoveredGemIds(this.coverageData);

    // Mark those gems as collected
    for (const gemId of coveredGemIds) {
      const gem = this.gemManager.gems.get(gemId);
      if (gem && !gem.collected) {
        this.gemManager.collectGem(gemId);
        this.gameState.collectGem(gemId);
      }
    }
  }

  _getPreviouslyCoveredGemIds() {
    // Use the aggregated coverage data to find which gems were covered in previous runs
    const aggregated = this.coverageTracker.getAggregatedCoverage();
    if (!aggregated) return new Set();

    // Build mapping and get covered gem IDs
    this.coverageMapper.buildMapping(
      aggregated,
      this.currentLayout.gems,
      this.currentLayout.tileData
    );

    return this.coverageMapper.getCoveredGemIds(aggregated);
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
        // Waiting for weapon drag-drop - but still animate player idle
        if (this.player) {
          this.player.update();
        }
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

    if (this.gemManager) {
      this.gemManager.update(delta);
    }
    if (this.hud) {
      this.hud.update(this.gameState);
    }
  }

  replayLevel() {
    this._startRun();
  }

  exit() {
    // Clean up
    this._hideWeaponUI();
  }

  getContainer() {
    return this.container;
  }
}
