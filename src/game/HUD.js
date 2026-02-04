import * as PIXI from 'pixi.js';
import { COLORS, VIEWPORT_WIDTH, PHASES } from '../constants.js';
import ProgressBar from '../ui/ProgressBar.js';
import Button from '../ui/Button.js';

export default class HUD {
  constructor() {
    this.container = new PIXI.Container();
    this.onCodeButton = null;
    this.onRunButton = null;
    this.onForgeButton = null;

    // Background bar
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.HUD_BG, 0.85);
    bg.drawRect(0, 0, VIEWPORT_WIDTH, 44);
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

    // View Code button
    this.codeBtn = new Button('{ } Code', 80, 28);
    this.codeBtn.x = 110;
    this.codeBtn.y = 8;
    this.codeBtn.onClick(() => {
      if (this.onCodeButton) this.onCodeButton();
    });
    this.container.addChild(this.codeBtn);

    // Run button
    this.runBtn = new Button('Run', 60, 28);
    this.runBtn.x = 200;
    this.runBtn.y = 8;
    this.runBtn.onClick(() => {
      if (this.onRunButton) this.onRunButton();
    });
    this.container.addChild(this.runBtn);

    // Forge button
    this.forgeBtn = new Button('Forge', 70, 28);
    this.forgeBtn.x = 270;
    this.forgeBtn.y = 8;
    this.forgeBtn.onClick(() => {
      if (this.onForgeButton) this.onForgeButton();
    });
    this.container.addChild(this.forgeBtn);

    // Coverage progress bar
    this.coverageBar = new ProgressBar(180, 14);
    this.coverageBar.x = VIEWPORT_WIDTH - 280;
    this.coverageBar.y = 6;
    this.container.addChild(this.coverageBar);

    // Coverage label
    this.coverageLabel = new PIXI.Text('Coverage:', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xaaaacc,
    });
    this.coverageLabel.x = VIEWPORT_WIDTH - 280;
    this.coverageLabel.y = 26;
    this.container.addChild(this.coverageLabel);

    // Gems counter
    this.gemsText = new PIXI.Text('Gems: 0/0', {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0x44aaff,
    });
    this.gemsText.x = VIEWPORT_WIDTH - 90;
    this.gemsText.y = 26;
    this.container.addChild(this.gemsText);
  }

  update(gameState) {
    this.levelText.text = `Level ${gameState.currentLevel + 1}`;
    this.runText.text = `Run #${gameState.runNumber}`;
    this.coverageBar.setProgress(gameState.coveragePercent / 100);
    this.coverageLabel.text = `Stmt: ${Math.round(gameState.coveragePercent)}% | Branch: ${Math.round(gameState.branchCoveragePercent)}%`;
    this.gemsText.text = `Gems: ${gameState.collectedGems.size}/${gameState.totalGems}`;

    // Show/hide Run and Forge buttons based on phase
    this.runBtn.visible = gameState.phase === PHASES.SETUP;
    this.forgeBtn.visible = gameState.phase === PHASES.SETUP;
  }

  getContainer() {
    return this.container;
  }
}
