import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS } from '../constants.js';
import Panel from '../ui/Panel.js';
import Button from '../ui/Button.js';
import ProgressBar from '../ui/ProgressBar.js';

export default class ResultScene {
  constructor(sceneManager, soundManager = null, progressManager = null) {
    this.sceneManager = sceneManager;
    this.soundManager = soundManager;
    this.progressManager = progressManager;
    this.container = new PIXI.Container();
    this.gameState = null;
    this.levelScene = null;
    this.coverageTracker = null;
  }

  async enter(data = {}) {
    this.container.removeChildren();
    this.gameState = data.gameState;
    this.levelScene = data.levelScene;
    this.coverageTracker = data.coverageTracker;

    // Get actual screen dimensions
    const gameApp = this.sceneManager.gameApp;
    const screenW = gameApp.getScreenWidth();
    const screenH = gameApp.getScreenHeight();

    // Background overlay - fill entire screen
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, screenW, screenH);
    bg.endFill();
    this.container.addChild(bg);

    const panelW = 450;
    const panelH = 320;
    const panel = new Panel(panelW, panelH);
    panel.centerOn(screenW, screenH);

    // Title - Level Complete
    const title = new PIXI.Text('LEVEL COMPLETE!', {
      fontFamily: 'monospace',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0x44ff44,
      align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = panelW / 2;
    title.y = 16;
    panel.addChild(title);

    // 100% Coverage message
    const coverageText = new PIXI.Text('100% Coverage Achieved!', {
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0xaaffaa,
    });
    coverageText.anchor.set(0.5, 0);
    coverageText.x = panelW / 2;
    coverageText.y = 50;
    panel.addChild(coverageText);

    // Runs completed
    const runText = new PIXI.Text(`Completed in ${this.gameState.runNumber} run${this.gameState.runNumber > 1 ? 's' : ''}`, {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xaaaacc,
    });
    runText.anchor.set(0.5, 0);
    runText.x = panelW / 2;
    runText.y = 75;
    panel.addChild(runText);

    // Statement coverage bar
    const stmtLabel = new PIXI.Text('Statement Coverage:', {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xe0e0e0,
    });
    stmtLabel.x = 30;
    stmtLabel.y = 110;
    panel.addChild(stmtLabel);

    const stmtBar = new ProgressBar(panelW - 60, 18);
    stmtBar.x = 30;
    stmtBar.y = 130;
    stmtBar.setProgress(1.0); // Always 100%
    panel.addChild(stmtBar);

    // Branch coverage bar
    const branchLabel = new PIXI.Text('Branch Coverage:', {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xe0e0e0,
    });
    branchLabel.x = 30;
    branchLabel.y = 158;
    panel.addChild(branchLabel);

    const branchBar = new ProgressBar(panelW - 60, 18);
    branchBar.x = 30;
    branchBar.y = 178;
    branchBar.setProgress(this.gameState.branchCoveragePercent / 100);
    panel.addChild(branchBar);

    // Score
    const scoreText = new PIXI.Text(
      `Score: ${this.gameState.score}`,
      { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', fill: 0xffdd44 }
    );
    scoreText.anchor.set(0.5, 0);
    scoreText.x = panelW / 2;
    scoreText.y = 210;
    panel.addChild(scoreText);

    // Play level complete sound
    if (this.soundManager) {
      this.soundManager.play('levelComplete');
    }

    // Buttons
    const btnY = 250;

    const nextBtn = new Button('Next Level', panelW - 60, 38);
    nextBtn.x = 30;
    nextBtn.y = btnY;
    const nextLevel = this.gameState.currentLevel + 1;
    if (nextLevel >= 7) {
      nextBtn.setText('Victory!');
      nextBtn.onClick(() => {
        this.sceneManager.switchTo('victory');
      });
    } else {
      nextBtn.onClick(() => {
        this.sceneManager.switchTo('level', { levelIndex: nextLevel });
      });
    }
    panel.addChild(nextBtn);

    const menuBtn = new Button('Back to Menu', panelW - 60, 38);
    menuBtn.x = 30;
    menuBtn.y = btnY + 48;
    menuBtn.onClick(() => {
      this.sceneManager.switchTo('title');
    });
    panel.addChild(menuBtn);

    this.container.addChild(panel);
  }

  exit() {}
  update() {}

  getContainer() {
    return this.container;
  }
}
