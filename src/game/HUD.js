import * as PIXI from 'pixi.js';
import { COLORS, VIEWPORT_WIDTH, CODE_PANEL_WIDTH, INVENTORY_PANEL_WIDTH, PHASES } from '../constants.js';
import ProgressBar from '../ui/ProgressBar.js';
import Button from '../ui/Button.js';

// Dungeon area width (viewport minus code panel and inventory panel)
const DUNGEON_WIDTH = VIEWPORT_WIDTH - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;

export default class HUD {
  constructor(soundManager = null) {
    this.container = new PIXI.Container();
    this.soundManager = soundManager;
    this.onTestButton = null;
    this.onForgeButton = null;
    this.onCrystalForgeButton = null;
    this.onResetButton = null;

    // Background bar (spans dungeon area only)
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.HUD_BG, 0.85);
    bg.drawRect(0, 0, DUNGEON_WIDTH, 44);
    bg.endFill();
    this.container.addChild(bg);

    // Level text
    this.levelText = new PIXI.Text('Level 1', {
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: COLORS.HUD_TEXT,
    });
    this.levelText.x = 12;
    this.levelText.y = 4;
    this.container.addChild(this.levelText);

    // Run counter
    this.runText = new PIXI.Text('Run #1', {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0xaaaacc,
    });
    this.runText.x = 12;
    this.runText.y = 24;
    this.container.addChild(this.runText);

    // Reset Tests button
    this.resetBtn = new Button('Reset', 60, 28);
    this.resetBtn.x = 110;
    this.resetBtn.y = 8;
    this.resetBtn.onClick(() => {
      if (this.onResetButton) this.onResetButton();
    });
    this.container.addChild(this.resetBtn);

    // View Test button
    this.testBtn = new Button('Tests', 60, 28);
    this.testBtn.x = 180;
    this.testBtn.y = 8;
    this.testBtn.onClick(() => {
      if (this.onTestButton) this.onTestButton();
    });
    this.container.addChild(this.testBtn);

    // Forge button (wider - important action)
    this.forgeBtn = new Button('⚒ Forge', 100, 28);
    this.forgeBtn.x = 250;
    this.forgeBtn.y = 8;
    this.forgeBtn.onClick(() => {
      if (this.onForgeButton) this.onForgeButton();
    });
    this.container.addChild(this.forgeBtn);

    // Crystal Forge button
    this.crystalBtn = new Button('🔮 Crystals', 100, 28);
    this.crystalBtn.x = 360;
    this.crystalBtn.y = 8;
    this.crystalBtn.onClick(() => {
      if (this.onCrystalForgeButton) this.onCrystalForgeButton();
    });
    this.container.addChild(this.crystalBtn);

    // Coverage progress bar
    this.coverageBar = new ProgressBar(280, 14);
    this.coverageBar.x = DUNGEON_WIDTH - 400;
    this.coverageBar.y = 6;
    this.container.addChild(this.coverageBar);

    // Coverage label
    this.coverageLabel = new PIXI.Text('Coverage:', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xaaaacc,
    });
    this.coverageLabel.x = DUNGEON_WIDTH - 400;
    this.coverageLabel.y = 26;
    this.container.addChild(this.coverageLabel);

    // Gems counter (positioned left of mute button)
    this.gemsText = new PIXI.Text('Gems: 0/0', {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0x44aaff,
    });
    this.gemsText.x = DUNGEON_WIDTH - 130;
    this.gemsText.y = 26;
    this.container.addChild(this.gemsText);

    // Mute toggle button
    this._createMuteButton();
  }

  _createMuteButton() {
    this.muteBtn = new PIXI.Container();
    this.muteBtn.x = DUNGEON_WIDTH - 36;
    this.muteBtn.y = 8;
    this.muteBtn.eventMode = 'static';
    this.muteBtn.cursor = 'pointer';

    this.muteBg = new PIXI.Graphics();
    this._drawMuteButton(false);
    this.muteBtn.addChild(this.muteBg);

    this.muteBtn.on('pointerover', () => {
      this.muteBg.alpha = 0.8;
    });
    this.muteBtn.on('pointerout', () => {
      this.muteBg.alpha = 1;
    });
    this.muteBtn.on('pointertap', () => {
      if (this.soundManager) {
        const muted = this.soundManager.toggleMute();
        this._drawMuteButton(muted);
      }
    });

    this.container.addChild(this.muteBtn);
  }

  _drawMuteButton(muted) {
    const g = this.muteBg;
    g.clear();

    // Background
    g.beginFill(0x333355, 0.8);
    g.lineStyle(1, 0x555577);
    g.drawRoundedRect(0, 0, 28, 28, 4);
    g.endFill();

    // Speaker icon
    g.lineStyle(0);
    g.beginFill(muted ? 0x666688 : 0xaaaacc);

    // Speaker body
    g.drawRect(6, 10, 5, 8);
    // Speaker cone
    g.moveTo(11, 10);
    g.lineTo(17, 6);
    g.lineTo(17, 22);
    g.lineTo(11, 18);
    g.closePath();
    g.endFill();

    if (muted) {
      // Draw X for muted
      g.lineStyle(2, 0xff6644);
      g.moveTo(19, 9);
      g.lineTo(25, 19);
      g.moveTo(25, 9);
      g.lineTo(19, 19);
    } else {
      // Draw sound waves
      g.lineStyle(1.5, 0xaaaacc);
      g.arc(17, 14, 4, -0.6, 0.6, false);
      g.moveTo(17, 14);
      g.arc(17, 14, 7, -0.5, 0.5, false);
    }
  }

  update(gameState) {
    this.levelText.text = `Level ${gameState.currentLevel + 1}`;
    this.runText.text = `Run #${gameState.runNumber}`;
    this.coverageBar.setProgress(gameState.coveragePercent / 100);
    this.coverageLabel.text = `Stmt: ${Math.round(gameState.coveragePercent)}% | Branch: ${Math.round(gameState.branchCoveragePercent)}%`;
    this.gemsText.text = `Gems: ${gameState.collectedGems.size}/${gameState.totalGems}`;

    // Show/hide Forge buttons based on phase
    this.forgeBtn.visible = gameState.phase === PHASES.SETUP;
    this.crystalBtn.visible = gameState.phase === PHASES.SETUP;

    // Sync mute button state
    if (this.soundManager) {
      this._drawMuteButton(this.soundManager.isMuted());
    }
  }

  getContainer() {
    return this.container;
  }
}
