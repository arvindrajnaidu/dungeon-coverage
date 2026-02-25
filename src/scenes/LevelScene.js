import * as PIXI from 'pixi.js';
import { PHASES, TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CODE_PANEL_WIDTH, INVENTORY_PANEL_WIDTH, DUNGEON_AREA_X } from '../constants.js';
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
import TestModal from '../ui/TestModal.js';
import CodePanel from '../ui/CodePanel.js';
import InventoryPanel from '../ui/InventoryPanel.js';
import WeaponSlots from '../ui/WeaponSlots.js';
import RunResultModal from '../ui/RunResultModal.js';
import Button from '../ui/Button.js';
import SpriteManager from '../engine/SpriteManager.js';
import levels from '../levels/index.js';

export default class LevelScene {
  constructor(sceneManager, spriteManager, weaponInventory, soundManager = null, progressManager = null) {
    this.sceneManager = sceneManager;
    this.spriteManager = spriteManager;
    this.weaponInventory = weaponInventory;
    this.soundManager = soundManager;
    this.progressManager = progressManager;
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
    this.testModal = null;
    this.runResultModal = null;
    this.codePanel = null;
    this.camera = null;

    // Track test runs for the Test modal
    this.testRuns = [];

    // Inventory panel and weapon slots
    this.inventoryPanel = null;
    this.weaponSlots = null;

    // Execution snapshot (result, error, stubDump)
    this.executionSnapshot = null;

    // Drag state
    this.dragState = null; // { type: 'weapon', id, sprite, active }

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

      // Load saved tests and replay them to build coverage
      if (this.progressManager) {
        const savedTests = this.progressManager.getLevelTests(levelIndex);
        this.testRuns = savedTests || [];

        if (this.testRuns.length > 0) {
          console.log('[LevelScene] Replaying', this.testRuns.length, 'saved tests to compute coverage');
          await this._replaySavedTests();
        }
      } else {
        this.testRuns = [];
      }
    }

    this._startRun();

    this.container.addChild(this.worldContainer);
    this.container.addChild(this.uiContainer);
  }

  // Silently execute all saved tests to compute aggregated coverage
  async _replaySavedTests() {
    for (const test of this.testRuns) {
      const { coverageData } = await this.coverageRunner.execute(
        this.levelData.source,
        this.levelData.fnName,
        test.inputs,
        { quiet: true }  // Don't log during replay
      );
      if (coverageData) {
        this.coverageTracker.addRun(coverageData);
      }
    }
    const stmtCov = this.coverageTracker.getStatementCoverage();
    console.log('[LevelScene] Replayed', this.testRuns.length, 'tests. Coverage:', stmtCov.percent.toFixed(0) + '%');
    // Note: _highlightCoveredLines is called in _startRun after codePanel is created
  }

  // Highlight all covered lines in the code panel based on aggregated coverage
  _highlightCoveredLines() {
    if (!this.codePanel) return;

    const coverage = this.coverageTracker.getAggregatedCoverage();
    if (!coverage) return;

    // Helper to highlight start and end lines of a location (for closing brackets)
    const highlightLoc = (loc) => {
      if (loc?.start?.line) {
        this.codePanel.highlightLine(loc.start.line, false);
      }
      // Also highlight end line for closing brackets
      if (loc?.end?.line && loc.end.line !== loc.start?.line) {
        this.codePanel.highlightLine(loc.end.line, false);
      }
    };

    // Get all covered statement lines
    const statementMap = coverage.statementMap;
    const s = coverage.s;

    for (const stmtId of Object.keys(statementMap)) {
      if (s[stmtId] > 0) {
        highlightLoc(statementMap[stmtId]);
      }
    }

    // Also highlight lines from covered branches (handles 'else' keyword lines)
    const branchMap = coverage.branchMap;
    const b = coverage.b;

    if (branchMap && b) {
      for (const branchId of Object.keys(branchMap)) {
        const branch = branchMap[branchId];
        const branchCounts = b[branchId];
        if (branch?.locations && branchCounts) {
          for (let i = 0; i < branch.locations.length; i++) {
            if (branchCounts[i] > 0) {
              highlightLoc(branch.locations[i]);
            }
          }
        }
      }
    }
  }

  _startRun() {
    this.worldContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.worldContainer.scale.set(1);
    this.noWeaponsOverlay = null;

    // Get screen dimensions and add full-screen background
    const gameApp = this.sceneManager.gameApp;
    const screenW = gameApp.getScreenWidth();
    const screenH = gameApp.getScreenHeight();

    // Background - fill entire screen
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a2e);
    bg.drawRect(0, 0, screenW, screenH);
    bg.endFill();
    this.container.addChildAt(bg, 0);

    // Layout: code panel on left, dungeon on right
    // No centering - start from left edge
    this.offsetX = 0;
    this.dungeonOffsetX = CODE_PANEL_WIDTH;
    this.offsetY = 0;
    this.cameraOffsetY = 0; // Keep player centered vertically

    // Create code panel on the left side
    if (this.codePanel) {
      this.container.removeChild(this.codePanel);
      this.codePanel.destroy({ children: true });
    }
    this.codePanel = new CodePanel(CODE_PANEL_WIDTH, screenH);
    this.codePanel.x = 0;
    this.codePanel.y = 0;
    this.codePanel.setSource(this.levelData.source, this.levelData.name);
    this.codePanel.onBack(() => {
      this.sceneManager.switchTo('title');
    });
    this.container.addChild(this.codePanel);

    // Highlight any previously covered lines from saved tests
    this._highlightCoveredLines();

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

    // Log the dungeon layout for debugging
    this._logDungeonLayout();

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

    // Camera - pass offset to position dungeon centered between code panel and inventory panel
    const dungeonWidth = screenW - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;
    this.camera = new Camera(this.worldContainer, this.dungeonOffsetX, this.cameraOffsetY, dungeonWidth);
    this.camera.snapTo(this.currentLayout.entry.x, this.currentLayout.entry.y);

    // Position UI container with offset (after code panel)
    this.uiContainer.x = this.dungeonOffsetX;
    this.uiContainer.y = this.offsetY;

    // HUD
    this.hud = new HUD(this.soundManager);
    this.hud.onTestButton = () => {
      if (this.testModal.visible) {
        this.testModal.hide();
      } else {
        this.testModal.show(this.testRuns, this.levelData.fnName, this.levelData.name);
      }
    };
    this.hud.onForgeButton = () => {
      if (this.gameState.phase === PHASES.SETUP) {
        this.sceneManager.switchTo('forge', { returnTo: 'level', levelIndex: this.gameState.currentLevel });
      }
    };
    this.hud.onResetButton = () => {
      this._resetTests();
    };
    this.uiContainer.addChild(this.hud.getContainer());

    // Test modal
    this.testModal = new TestModal();
    this.uiContainer.addChild(this.testModal.getContainer());

    // Run result modal
    this.runResultModal = new RunResultModal(this.soundManager);
    this.runResultModal.onContinue((isLevelComplete) => {
      if (isLevelComplete) {
        this.sceneManager.switchTo('result', {
          gameState: this.gameState,
          levelScene: this,
          coverageTracker: this.coverageTracker,
        });
      } else {
        this._returnToStart();
      }
    });
    this.uiContainer.addChild(this.runResultModal);

    this.gameState.setPhase(PHASES.SETUP);

    // Setup weapon slots and sidebar
    this._showWeaponUI();
  }

  _showWeaponUI() {
    // Get screen dimensions first
    const gameApp = this.sceneManager.gameApp;
    const screenW = gameApp.getScreenWidth();
    const screenH = gameApp.getScreenHeight();

    const paramNames = this.coverageRunner.extractParamNames(
      this.levelData.source,
      this.levelData.fnName
    );

    const paramHints = paramNames.map(name => {
      const levelParam = this.levelData.params?.find(p => p.name === name);
      if (levelParam) return levelParam;
      return { name, type: '', placeholder: '' };
    });

    // Check if player has weapons
    const hasWeapons = this.weaponInventory.getAll().length > 0;

    // Create weapon slots centered above entry point
    this.weaponSlots = new WeaponSlots(this.spriteManager, this.soundManager);
    const entryX = this.currentLayout.entry.x;
    const entryY = this.currentLayout.entry.y;
    this.weaponSlots.setParams(paramHints, entryX, entryY);
    this.weaponSlots.onRun(() => {
      if (this._canRun()) {
        const values = this.weaponSlots.getValues();
        this._hideWeaponUI();
        this._executeWithInputs(values);
      }
    });
    this.worldContainer.addChild(this.weaponSlots);

    // Create inventory panel (right side - weapons only)
    // Add to main container so it can be positioned at the right edge of the screen
    this.inventoryPanel = new InventoryPanel(this.spriteManager, this.weaponInventory, null, INVENTORY_PANEL_WIDTH, screenH);
    this.inventoryPanel.x = screenW - INVENTORY_PANEL_WIDTH;
    this.inventoryPanel.y = 0;
    this.inventoryPanel.onWeaponDrag((weapon, e) => {
      this._startWeaponDrag(weapon, e);
    });
    this.inventoryPanel.show();
    this.container.addChild(this.inventoryPanel);

    // Show "no weapons" prompt if inventory is empty
    if (!hasWeapons) {
      this._showNoWeaponsPrompt();
    }

    // Enable stage-level pointer events for drag
    this.container.eventMode = 'static';
    // Hit area covers the full screen for drag tracking
    this.container.hitArea = new PIXI.Rectangle(0, 0, screenW, screenH);
    this.container.on('pointermove', this._onPointerMove);
    this.container.on('pointerup', this._onPointerUp);
    this.container.on('pointerupoutside', this._onPointerUp);
  }

  _showNoWeaponsPrompt() {
    this.noWeaponsOverlay = new PIXI.Container();

    // Calculate dungeon area dimensions (excluding code panel and inventory panel)
    const dungeonW = VIEWPORT_WIDTH - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;
    const dungeonH = VIEWPORT_HEIGHT;

    // Semi-transparent background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, dungeonW, dungeonH);
    bg.endFill();
    bg.eventMode = 'static';
    this.noWeaponsOverlay.addChild(bg);

    // Panel
    const panelW = 380;
    const panelH = 200;
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1a1a3e);
    panel.lineStyle(2, 0xffaa44);
    panel.drawRoundedRect((dungeonW - panelW) / 2, (dungeonH - panelH) / 2, panelW, panelH, 10);
    panel.endFill();
    this.noWeaponsOverlay.addChild(panel);

    // Title
    const title = new PIXI.Text('No Weapons Yet!', {
      fontFamily: 'monospace',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xffaa44,
    });
    title.anchor.set(0.5);
    title.x = dungeonW / 2;
    title.y = dungeonH / 2 - 55;
    this.noWeaponsOverlay.addChild(title);

    // Description
    const desc = new PIXI.Text('To explore this dungeon, forge weapons first.\nWeapons are test inputs that you drag\ninto the function parameter slots.', {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0xaaaacc,
      align: 'center',
    });
    desc.anchor.set(0.5);
    desc.x = dungeonW / 2;
    desc.y = dungeonH / 2;
    this.noWeaponsOverlay.addChild(desc);

    // Go to Forge button
    const forgeBtn = new Button('Go to Forge', 130, 36, this.soundManager);
    forgeBtn.x = dungeonW / 2 - 140;
    forgeBtn.y = dungeonH / 2 + 50;
    forgeBtn.onClick(() => {
      this.sceneManager.switchTo('forge', { returnTo: 'level', levelIndex: this.gameState.currentLevel });
    });
    this.noWeaponsOverlay.addChild(forgeBtn);

    // Back to Menu button
    const backBtn = new Button('Back to Menu', 130, 36, this.soundManager);
    backBtn.x = dungeonW / 2 + 10;
    backBtn.y = dungeonH / 2 + 50;
    backBtn.onClick(() => {
      this.sceneManager.switchTo('title');
    });
    this.noWeaponsOverlay.addChild(backBtn);

    this.uiContainer.addChild(this.noWeaponsOverlay);
  }

  _hideNoWeaponsPrompt() {
    if (this.noWeaponsOverlay) {
      this.uiContainer.removeChild(this.noWeaponsOverlay);
      this.noWeaponsOverlay = null;
    }
  }

  _showExecutionError(error) {
    // Play error sound
    if (this.soundManager) {
      this.soundManager.play('error');
    }

    // Calculate dungeon area dimensions (excluding code panel and inventory panel)
    const dungeonW = VIEWPORT_WIDTH - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;
    const dungeonH = VIEWPORT_HEIGHT;

    // Create error overlay
    const overlay = new PIXI.Container();

    // Semi-transparent background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.8);
    bg.drawRect(0, 0, dungeonW, dungeonH);
    bg.endFill();
    bg.eventMode = 'static';
    overlay.addChild(bg);

    // Error panel
    const panelW = 450;
    const panelH = 220;
    const panel = new PIXI.Graphics();
    panel.beginFill(0x2a1a1a);
    panel.lineStyle(3, 0xff4444);
    panel.drawRoundedRect((dungeonW - panelW) / 2, (dungeonH - panelH) / 2, panelW, panelH, 10);
    panel.endFill();
    overlay.addChild(panel);

    // Error icon/title
    const title = new PIXI.Text('Execution Error', {
      fontFamily: 'monospace',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xff4444,
    });
    title.anchor.set(0.5);
    title.x = dungeonW / 2;
    title.y = dungeonH / 2 - 70;
    overlay.addChild(title);

    // Error message
    const errorMsg = error.message || String(error);
    const msgText = new PIXI.Text(errorMsg, {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xffaaaa,
      wordWrap: true,
      wordWrapWidth: panelW - 40,
      align: 'center',
    });
    msgText.anchor.set(0.5);
    msgText.x = dungeonW / 2;
    msgText.y = dungeonH / 2 - 20;
    overlay.addChild(msgText);

    // Hint
    const hint = new PIXI.Text('Check your input values and try again.', {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0x888899,
    });
    hint.anchor.set(0.5);
    hint.x = dungeonW / 2;
    hint.y = dungeonH / 2 + 30;
    overlay.addChild(hint);

    // OK button
    const btnW = 100;
    const btnH = 32;
    const btn = new PIXI.Graphics();
    btn.beginFill(0x553333);
    btn.lineStyle(2, 0xff6666);
    btn.drawRoundedRect((dungeonW - btnW) / 2, dungeonH / 2 + 55, btnW, btnH, 6);
    btn.endFill();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    overlay.addChild(btn);

    const btnLabel = new PIXI.Text('OK', {
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    btnLabel.anchor.set(0.5);
    btnLabel.x = dungeonW / 2;
    btnLabel.y = dungeonH / 2 + 55 + btnH / 2;
    overlay.addChild(btnLabel);

    // Close on button click or background click
    const closeOverlay = () => {
      this.uiContainer.removeChild(overlay);
      overlay.destroy({ children: true });
      // Return to setup phase
      this.gameState.setPhase(PHASES.SETUP);
      this.weaponSlots.reset();
      // Show the UI again
      if (this.weaponSlots) this.weaponSlots.visible = true;
      if (this.inventoryPanel) this.inventoryPanel.show();
      // Update run button visibility (should be hidden after reset)
      this._updateRunButtonVisibility();
    };

    btn.on('pointertap', closeOverlay);
    bg.on('pointertap', closeOverlay);

    this.uiContainer.addChild(overlay);
  }

  _hideWeaponUI() {
    if (this.inventoryPanel) {
      this.inventoryPanel.hide();
    }
    if (this.weaponSlots) {
      this.weaponSlots.visible = false;
    }
    this._cancelDrag();
    this.container.off('pointermove', this._onPointerMove);
    this.container.off('pointerup', this._onPointerUp);
    this.container.off('pointerupoutside', this._onPointerUp);
  }

  _canRun() {
    return this.weaponSlots && this.weaponSlots.allFilled();
  }

  _updateRunButtonVisibility() {
    if (this.weaponSlots && this.weaponSlots.runButton) {
      this.weaponSlots.runButton.visible = this._canRun();
    }
  }

  // --- Drag & Drop ---

  _startWeaponDrag(weapon, e) {
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
      type: 'weapon',
      id: weapon.id,
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

    const pos = e.data.getLocalPosition(this.worldContainer);

    if (this.dragState.type === 'weapon') {
      // Check if dropped on weapon slot
      const slotIdx = this.weaponSlots.isOverSlot(pos.x, pos.y);
      if (slotIdx >= 0) {
        const weapon = this.weaponInventory.get(this.dragState.id);
        if (weapon) {
          this.weaponSlots.dropWeapon(slotIdx, weapon);
          this._updateRunButtonVisibility();
        }
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
    const { coverageData, result, error, stubDump } = await this.coverageRunner.execute(
      this.levelData.source,
      this.levelData.fnName,
      values
    );

    // Handle execution error - show alert and return to setup
    if (error) {
      console.log('%c[LevelScene] Function execution error:', 'color: #ff6644;', error);
      console.log('%c[LevelScene] Error message:', 'color: #ff6644;', error?.message);
      console.log('%c[LevelScene] Error stack:', 'color: #ff6644;', error?.stack);
      this._showExecutionError(error);
      return;
    }

    console.log('%c[LevelScene] Execution succeeded:', 'color: #44ff44;');
    console.log('%c[LevelScene] Result type:', 'color: #44ff44;', typeof result);
    console.log('%c[LevelScene] Result value:', 'color: #44ff44;', result);
    console.log('%c[LevelScene] Coverage data:', 'color: #44ff44;', coverageData ? 'present' : 'null');
    console.log('%c[LevelScene] Stub dump:', 'color: #66ffcc;', stubDump);

    // Store the current inputs for test tracking
    this._currentRunInputs = values;

    // Store execution snapshot for the run result modal
    this.executionSnapshot = {
      result,
      error: null,
      stubDump,
    };

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

      console.log('[Execute] Covered gem IDs:', [...coveredGems]);
      console.log('[Execute] All gems in manager:', [...this.gemManager.gems.keys()]);

      // Build waypoints for ALL covered gems (hero walks the full execution path)
      // and track which ones can still be collected (not already green)
      this.coveredGemPositions = new Set();
      const gemWaypoints = [];
      for (const gemId of coveredGems) {
        const gem = this.gemManager.gems.get(gemId);
        if (gem) {
          console.log(`[Execute] Gem ${gemId} at (${gem.x}, ${gem.y}) walkable:`, this.dungeonMap.isWalkable(gem.x, gem.y));
          // Get the layout gem info which has loc
          const layoutGem = this.currentLayout.gems.find(g => g.id === gemId);
          const line = layoutGem?.loc?.start?.line || 0;
          const column = layoutGem?.loc?.start?.column || 0;
          // Hero walks through all covered gems
          gemWaypoints.push({ x: gem.x, y: gem.y, id: gemId, line, column });
          // Only mark for collection if not already collected
          if (!gem.collected) {
            this.coveredGemPositions.add(`${gem.x},${gem.y}`);
          }
        } else {
          console.warn(`[Execute] Gem ${gemId} not found in gem manager!`);
        }
      }

      // Sort waypoints by source line number (execution order in code)
      gemWaypoints.sort((a, b) => a.line - b.line || a.column - b.column);
      console.log('[Execute] Sorted waypoints by line:', gemWaypoints);

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
    // Build path using coverage order - walk when possible, teleport when not
    const path = [];
    let curX = this.player.gridX;
    let curY = this.player.gridY;

    console.log('%c[WalkPath] Building path from', 'color: #44aaff', curX, curY);
    console.log('%c[WalkPath] Waypoints (coverage order):', 'color: #44aaff', gemWaypoints.map(w => `(${w.x},${w.y}) line:${w.line}`));

    for (let i = 0; i < gemWaypoints.length; i++) {
      const wp = gemWaypoints[i];
      if (wp.x === curX && wp.y === curY) {
        console.log(`[WalkPath] #${i}: Already at (${wp.x},${wp.y})`);
        continue;
      }

      const segment = this._bfs(curX, curY, wp.x, wp.y);
      if (segment) {
        console.log(`%c[WalkPath] #${i}: WALK from (${curX},${curY}) to (${wp.x},${wp.y}) - ${segment.length} steps`, 'color: #44ff44');
        // Add walk steps (skip first tile - current position)
        for (let j = 1; j < segment.length; j++) {
          path.push({ ...segment[j], action: 'walk' });
        }
      } else {
        // No walkable path - teleport (execution jumped to this statement)
        console.log(`%c[WalkPath] #${i}: TELEPORT from (${curX},${curY}) to (${wp.x},${wp.y})`, 'color: #ff4444; font-weight: bold');
        console.log(`  Source tile type: ${this.dungeonMap.getTileType(curX, curY)}, walkable: ${this.dungeonMap.isWalkable(curX, curY)}`);
        console.log(`  Target tile type: ${this.dungeonMap.getTileType(wp.x, wp.y)}, walkable: ${this.dungeonMap.isWalkable(wp.x, wp.y)}`);
        path.push({ x: wp.x, y: wp.y, action: 'teleport' });
      }
      curX = wp.x;
      curY = wp.y;
    }

    const walkCount = path.filter(p => p.action === 'walk').length;
    const teleportCount = path.filter(p => p.action === 'teleport').length;
    console.log(`%c[WalkPath] Final: ${path.length} steps (${walkCount} walk, ${teleportCount} teleport)`, 'color: #44aaff; font-weight: bold');
    return path;
  }

  _bfs(sx, sy, ex, ey) {
    if (sx === ex && sy === ey) return [{ x: sx, y: sy }];

    // Debug: check if start and end are walkable
    const startWalkable = this.dungeonMap.isWalkable(sx, sy);
    const endWalkable = this.dungeonMap.isWalkable(ex, ey);
    if (!startWalkable || !endWalkable) {
      console.warn(`[BFS] Start (${sx},${sy}) walkable: ${startWalkable}, End (${ex},${ey}) walkable: ${endWalkable}`);
      if (!startWalkable) {
        console.warn(`[BFS] Start tile type: ${this.dungeonMap.getTileType(sx, sy)}`);
      }
      if (!endWalkable) {
        console.warn(`[BFS] End tile type: ${this.dungeonMap.getTileType(ex, ey)}`);
      }
    }

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

    // Path not found - detailed diagnostic
    console.warn(`[BFS] NO PATH from (${sx},${sy}) to (${ex},${ey}). Visited ${visited.size} tiles.`);

    // Log the tiles around start and end to help debug
    console.warn(`[BFS] Tiles around start (${sx},${sy}):`);
    for (const [dx, dy, dir] of [[0,-1,'up'], [0,1,'down'], [-1,0,'left'], [1,0,'right']]) {
      const nx = sx + dx, ny = sy + dy;
      const type = this.dungeonMap.getTileType(nx, ny);
      const walkable = this.dungeonMap.isWalkable(nx, ny);
      console.warn(`  ${dir}: (${nx},${ny}) type=${type} walkable=${walkable}`);
    }
    console.warn(`[BFS] Tiles around end (${ex},${ey}):`);
    for (const [dx, dy, dir] of [[0,-1,'up'], [0,1,'down'], [-1,0,'left'], [1,0,'right']]) {
      const nx = ex + dx, ny = ey + dy;
      const type = this.dungeonMap.getTileType(nx, ny);
      const walkable = this.dungeonMap.isWalkable(nx, ny);
      console.warn(`  ${dir}: (${nx},${ny}) type=${type} walkable=${walkable}`);
    }

    return null;
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

      // If we have 100% coverage but still have uncollected gems, force collect them
      // This handles cases where the line:column mapping isn't perfect
      const stmtCov = this.coverageTracker.getStatementCoverage();
      if (stmtCov.percent >= 100) {
        console.log('[LevelScene] 100% coverage - force collecting any remaining gems');
        for (const [gemId, gem] of this.gemManager.gems) {
          if (!gem.collected) {
            console.log(`[LevelScene] Force collecting gem ${gemId}`);
            this.gemManager.collectGem(gemId);
            this.gameState.collectGem(gemId);
          }
        }
      }

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

        // Highlight the corresponding line in the code panel
        const layoutGem = this.currentLayout.gems.find(g => g.id === gemId);
        if (layoutGem?.loc?.start?.line && this.codePanel) {
          this.codePanel.highlightLine(layoutGem.loc.start.line, true);
        }
      }
    }
  }

  _markCoveredGemsFromCoverage() {
    // Use the AGGREGATED coverage to get all covered gem IDs across all runs
    const aggregated = this.coverageTracker.getAggregatedCoverage();
    if (!aggregated) return;

    // Rebuild mapping with aggregated coverage (statementMap is the same)
    this.coverageMapper.buildMapping(
      aggregated,
      this.currentLayout.gems,
      this.currentLayout.tileData
    );

    const coveredGemIds = this.coverageMapper.getCoveredGemIds(aggregated);

    console.log('[MarkCovered] Aggregated coverage - covered gems:', [...coveredGemIds]);
    console.log('[MarkCovered] All gems in manager:', [...this.gemManager.gems.keys()]);

    // Mark those gems as collected and highlight lines
    for (const gemId of coveredGemIds) {
      const gem = this.gemManager.gems.get(gemId);
      if (gem && !gem.collected) {
        this.gemManager.collectGem(gemId);
        this.gameState.collectGem(gemId);
        console.log(`[MarkCovered] Collected gem ${gemId}`);

        // Highlight the line in code panel
        const layoutGem = this.currentLayout.gems.find(g => g.id === gemId);
        if (layoutGem?.loc?.start?.line && this.codePanel) {
          this.codePanel.highlightLine(layoutGem.loc.start.line, false);
        }
      }
    }

    // Debug: check for any uncollected gems
    for (const [gemId, gem] of this.gemManager.gems) {
      if (!gem.collected) {
        console.warn(`[MarkCovered] Gem ${gemId} at (${gem.x}, ${gem.y}) is still uncollected!`);
      }
    }
  }

  _describeInputs(inputs) {
    if (!inputs) return 'no inputs';
    const parts = [];
    for (const [key, value] of Object.entries(inputs)) {
      if (value && value.__stub) {
        const ret = value.returns;
        if (ret === undefined) {
          parts.push(`${key} as stub`);
        } else {
          parts.push(`${key} stub→${JSON.stringify(ret).substring(0, 20)}`);
        }
      } else if (typeof value === 'number') {
        parts.push(`${key}=${value}`);
      } else if (typeof value === 'boolean') {
        parts.push(`${key}=${value}`);
      } else if (typeof value === 'string') {
        parts.push(`${key}="${value.substring(0, 10)}${value.length > 10 ? '...' : ''}"`);
      } else if (Array.isArray(value)) {
        parts.push(`${key}[${value.length}]`);
      } else if (typeof value === 'object') {
        parts.push(`${key}={...}`);
      }
    }
    return parts.join(', ') || 'given inputs';
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

    // Highlight all covered lines (including branch lines like 'else')
    this._highlightCoveredLines();

    const isComplete = this.coverageTracker.isFullCoverage();

    // Save the test case (inputs only - coverage is computed by replaying tests)
    if (this._currentRunInputs) {
      const description = this._describeInputs(this._currentRunInputs);
      const testCase = {
        description,
        inputs: this._currentRunInputs,
      };
      this.testRuns.push(testCase);

      // Save test to localStorage
      if (this.progressManager) {
        this.progressManager.addTest(this.gameState.currentLevel, testCase);
      }
    }

    // Mark level complete if 100% coverage
    if (isComplete && this.progressManager) {
      this.progressManager.markLevelCompleted(this.gameState.currentLevel, this.gameState.score);
    }

    // Get dungeon dimensions for modal
    const gameApp = this.sceneManager.gameApp;
    const screenW = gameApp.getScreenWidth();
    const screenH = gameApp.getScreenHeight();
    const dungeonWidth = screenW - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;
    const dungeonHeight = screenH;

    // Show run result modal with execution snapshot
    this.gameState.setPhase(PHASES.RESULTS);
    this.runResultModal.show({
      executionSnapshot: this.executionSnapshot,
      stmtCoverage: stmtCov.percent,
      branchCoverage: branchCov.percent,
      runNumber: this.gameState.runNumber,
      isLevelComplete: isComplete,
      dungeonWidth,
      dungeonHeight,
    });
  }

  _returnToStart() {
    // Fade out hero, teleport to entry, fade in, then start next run
    this.gameState.setPhase(PHASES.RETURNING);

    // Fade out
    const playerContainer = this.player.getContainer();
    let alpha = 1;
    const fadeOut = () => {
      alpha -= 0.1;
      playerContainer.alpha = alpha;
      if (alpha > 0) {
        requestAnimationFrame(fadeOut);
      } else {
        // Teleport to entry
        this.player.setPosition(this.currentLayout.entry.x, this.currentLayout.entry.y);
        this.camera.snapTo(this.currentLayout.entry.x, this.currentLayout.entry.y);

        // Fade in
        const fadeIn = () => {
          alpha += 0.1;
          playerContainer.alpha = alpha;
          if (alpha < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            playerContainer.alpha = 1;
            // Start next run
            this._startRun();
          }
        };
        requestAnimationFrame(fadeIn);
      }
    };
    requestAnimationFrame(fadeOut);
  }

  _logDungeonLayout() {
    const layout = this.currentLayout;
    const TILE_NAMES = {
      0: '.',  // EMPTY
      1: 'F',  // FLOOR
      2: '#',  // WALL
      3: '?',  // BRANCH
      4: 'M',  // MERGE
      5: 'E',  // EXIT
      6: 'S',  // ENTRY
      7: '-',  // CORRIDOR_H
      8: '|',  // CORRIDOR_V
      9: '<',  // DOOR_LEFT
      10: '>', // DOOR_RIGHT
      11: 'L', // LOOP_BACK
      12: 'C', // CATCH_ENTRY
    };

    console.log('%c=== DUNGEON LAYOUT ===', 'color: #44aaff; font-weight: bold; font-size: 14px;');
    console.log('Level:', this.levelData.name);
    console.log('Grid size:', layout.width, 'x', layout.height);
    console.log('Entry:', layout.entry);
    console.log('Exit:', layout.exit);

    // Print ASCII grid with column headers
    console.log('%cGrid (. = empty, # = wall, F = floor, - = corridor_h, | = corridor_v, S = entry, E = exit, M = merge, ? = branch):', 'color: #ffaa44; font-weight: bold;');

    // Column header
    let header = '   ';
    for (let x = 0; x < (layout.grid[0]?.length || 0); x++) {
      header += (x % 10).toString();
    }
    console.log(header);

    // Grid rows
    for (let y = 0; y < layout.grid.length; y++) {
      let row = y.toString().padStart(2) + ' ';
      for (let x = 0; x < layout.grid[y].length; x++) {
        const tile = layout.grid[y][x];
        // Check if there's a gem at this position
        const hasGem = layout.gems.some(g => g.x === x && g.y === y);
        if (hasGem) {
          row += 'G'; // Show gems
        } else {
          row += TILE_NAMES[tile] || '?';
        }
      }
      console.log(row);
    }

    // Print gem positions with their line numbers
    console.log('%cGems (sorted by line):', 'color: #ffaa44; font-weight: bold;');
    const sortedGems = [...layout.gems].sort((a, b) => (a.loc?.start?.line || 0) - (b.loc?.start?.line || 0));
    for (const gem of sortedGems) {
      const tileType = layout.grid[gem.y]?.[gem.x];
      console.log(`  ${gem.id}: (${gem.x}, ${gem.y}) line:${gem.loc?.start?.line || '?'} tile:${TILE_NAMES[tileType] || tileType}`);
    }

    console.log('%c=== END LAYOUT ===', 'color: #44aaff; font-weight: bold;');
  }

  update(delta) {
    if (!this.dungeonMap) return;

    switch (this.gameState.phase) {
      case PHASES.SETUP:
        // Waiting for weapon drag-drop - but still animate player idle
        if (this.player) {
          this.player.update();
        }
        // Animate weapon slots glow effect
        if (this.weaponSlots) {
          this.weaponSlots.update(delta);
        }
        break;
      case PHASES.EXECUTING:
        // Waiting for async coverage execution
        break;
      case PHASES.ANIMATING:
        this._updateAnimating(delta);
        break;
      case PHASES.RETURNING:
        this._updateReturning(delta);
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

  _updateReturning(delta) {
    // Fade animation is handled by requestAnimationFrame in _returnToStart
    // Just keep gems animating
  }

  _resetTests() {
    // Clear test runs
    this.testRuns = [];

    // Clear saved tests in progress manager
    if (this.progressManager) {
      this.progressManager.clearLevelTests(this.gameState.currentLevel);
    }

    // Reset coverage tracker
    this.coverageTracker.reset();

    // Clear code panel highlights
    if (this.codePanel) {
      this.codePanel.clearHighlights();
    }

    // Play sound
    if (this.soundManager) {
      this.soundManager.play('sceneTransition');
    }

    console.log('[LevelScene] Tests reset for level', this.gameState.currentLevel);

    // Restart the level
    this._startRun();
  }

  replayLevel() {
    this._startRun();
  }

  exit() {
    // Clean up
    this._hideWeaponUI();
    if (this.codePanel) {
      this.codePanel.destroy({ children: true });
      this.codePanel = null;
    }
  }

  getContainer() {
    return this.container;
  }
}
