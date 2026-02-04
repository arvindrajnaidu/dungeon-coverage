import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS } from '../constants.js';
import Panel from '../ui/Panel.js';
import Button from '../ui/Button.js';
import ProgressBar from '../ui/ProgressBar.js';

export default class ResultScene {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
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

    // Background overlay
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    bg.endFill();
    this.container.addChild(bg);

    const panelW = 450;
    const panelH = 380;
    const panel = new Panel(panelW, panelH);
    panel.centerOn(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Title
    const title = new PIXI.Text('RUN COMPLETE', {
      fontFamily: 'monospace',
      fontSize: 22,
      fontWeight: 'bold',
      fill: 0xffaa44,
      align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = panelW / 2;
    title.y = 16;
    panel.addChild(title);

    // Run number
    const runText = new PIXI.Text(`Run #${this.gameState.runNumber}`, {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xaaaacc,
    });
    runText.anchor.set(0.5, 0);
    runText.x = panelW / 2;
    runText.y = 48;
    panel.addChild(runText);

    // Statement coverage
    const stmtLabel = new PIXI.Text('Statement Coverage:', {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xe0e0e0,
    });
    stmtLabel.x = 30;
    stmtLabel.y = 80;
    panel.addChild(stmtLabel);

    const stmtBar = new ProgressBar(panelW - 60, 18);
    stmtBar.x = 30;
    stmtBar.y = 100;
    stmtBar.setProgress(this.gameState.coveragePercent / 100);
    panel.addChild(stmtBar);

    // Branch coverage
    const branchLabel = new PIXI.Text('Branch Coverage:', {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xe0e0e0,
    });
    branchLabel.x = 30;
    branchLabel.y = 130;
    panel.addChild(branchLabel);

    const branchBar = new ProgressBar(panelW - 60, 18);
    branchBar.x = 30;
    branchBar.y = 150;
    branchBar.setProgress(this.gameState.branchCoveragePercent / 100);
    panel.addChild(branchBar);

    // Gems collected
    const gemsText = new PIXI.Text(
      `Gems: ${this.gameState.collectedGems.size} / ${this.gameState.totalGems}`,
      { fontFamily: 'monospace', fontSize: 14, fill: 0x44aaff }
    );
    gemsText.anchor.set(0.5, 0);
    gemsText.x = panelW / 2;
    gemsText.y = 185;
    panel.addChild(gemsText);

    // Score
    const scoreText = new PIXI.Text(
      `Score: ${this.gameState.score}`,
      { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', fill: 0xffdd44 }
    );
    scoreText.anchor.set(0.5, 0);
    scoreText.x = panelW / 2;
    scoreText.y = 215;
    panel.addChild(scoreText);

    // Full coverage message
    const isFullCoverage = this.coverageTracker && this.coverageTracker.isFullCoverage();
    if (isFullCoverage) {
      const fullText = new PIXI.Text('100% COVERAGE! Level Complete!', {
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0x44ff44,
      });
      fullText.anchor.set(0.5, 0);
      fullText.x = panelW / 2;
      fullText.y = 250;
      panel.addChild(fullText);
    }

    // Buttons
    const btnY = isFullCoverage ? 285 : 260;

    const replayBtn = new Button('Run Again (new inputs)', panelW - 60, 38);
    replayBtn.x = 30;
    replayBtn.y = btnY;
    replayBtn.onClick(() => {
      this.sceneManager.switchTo('level', {
        levelIndex: this.gameState.currentLevel,
        _replay: true,
      });
    });
    panel.addChild(replayBtn);

    if (isFullCoverage) {
      const nextBtn = new Button('Next Level', panelW - 60, 38);
      nextBtn.x = 30;
      nextBtn.y = btnY + 48;
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
    }

    const menuBtn = new Button('Back to Menu', panelW - 60, 38);
    menuBtn.x = 30;
    menuBtn.y = isFullCoverage ? btnY + 96 : btnY + 48;
    menuBtn.onClick(() => {
      const unlocked = isFullCoverage
        ? this.gameState.currentLevel + 2
        : this.gameState.currentLevel + 1;
      this.sceneManager.switchTo('title', { unlockedLevels: unlocked });
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
