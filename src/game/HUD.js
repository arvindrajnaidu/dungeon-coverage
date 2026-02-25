import * as PIXI from 'pixi.js';
import { COLORS, VIEWPORT_WIDTH, CODE_PANEL_WIDTH, INVENTORY_PANEL_WIDTH, PHASES } from '../constants.js';
import ProgressBar from '../ui/ProgressBar.js';
import Button from '../ui/Button.js';

// Dungeon area width (viewport minus code panel and inventory panel)
const DUNGEON_WIDTH = VIEWPORT_WIDTH - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;
const HUD_HEIGHT = 38;

export default class HUD {
  constructor(soundManager = null) {
    this.container = new PIXI.Container();
    this.soundManager = soundManager;
    this.onTestButton = null;
    this.onForgeButton = null;
    this.onResetButton = null;

    // Background bar (spans dungeon area only) - more compact
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.HUD_BG, 0.85);
    bg.drawRect(0, 0, DUNGEON_WIDTH, HUD_HEIGHT);
    bg.endFill();
    this.container.addChild(bg);

    // Level text and run counter on same line
    this.levelText = new PIXI.Text('Level 1', {
      fontFamily: 'monospace',
      fontSize: 12,
      fontWeight: 'bold',
      fill: COLORS.HUD_TEXT,
    });
    this.levelText.x = 8;
    this.levelText.y = 8;
    this.container.addChild(this.levelText);

    this.runText = new PIXI.Text('Run #1', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0x888899,
    });
    this.runText.x = 75;
    this.runText.y = 10;
    this.container.addChild(this.runText);

    // Buttons - original sizes
    this.resetBtn = new Button('Reset', 60, 28);
    this.resetBtn.x = 140;
    this.resetBtn.y = 2;
    this.resetBtn.onClick(() => {
      if (this.onResetButton) this.onResetButton();
    });
    this.container.addChild(this.resetBtn);

    this.testBtn = new Button('Tests', 60, 28);
    this.testBtn.x = 210;
    this.testBtn.y = 2;
    this.testBtn.onClick(() => {
      if (this.onTestButton) this.onTestButton();
    });
    this.container.addChild(this.testBtn);

    this.forgeBtn = new Button('⚒ Forge', 100, 28);
    this.forgeBtn.x = 280;
    this.forgeBtn.y = 2;
    this.forgeBtn.onClick(() => {
      if (this.onForgeButton) this.onForgeButton();
    });
    this.container.addChild(this.forgeBtn);

    // Coverage progress bar - in the HUD on the right side
    this.coverageBar = new ProgressBar(200, 16);
    this.coverageBar.x = DUNGEON_WIDTH - 320;
    this.coverageBar.y = 3;
    this.container.addChild(this.coverageBar);

    this.coverageLabel = new PIXI.Text('Stmt: 0% | Branch: 0%', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xaaaacc,
    });
    this.coverageLabel.x = DUNGEON_WIDTH - 320;
    this.coverageLabel.y = 21;
    this.container.addChild(this.coverageLabel);

    this.gemsText = new PIXI.Text('Gems: 0/0', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0x44aaff,
    });
    this.gemsText.x = DUNGEON_WIDTH - 120;
    this.gemsText.y = 21;
    this.container.addChild(this.gemsText);

    // Mute toggle button - top right
    this._createMuteButton();
  }

  _createMuteButton() {
    this.muteBtn = new PIXI.Container();
    this.muteBtn.x = DUNGEON_WIDTH - 32;
    this.muteBtn.y = 3;
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

    // Show/hide Forge button based on phase
    this.forgeBtn.visible = gameState.phase === PHASES.SETUP;

    // Sync mute button state
    if (this.soundManager) {
      this._drawMuteButton(this.soundManager.isMuted());
    }
  }

  getContainer() {
    return this.container;
  }
}
