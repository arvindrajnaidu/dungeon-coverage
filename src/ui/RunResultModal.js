import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CODE_PANEL_WIDTH, INVENTORY_PANEL_WIDTH } from '../constants.js';
import Panel from './Panel.js';
import Button from './Button.js';
import ProgressBar from './ProgressBar.js';

export default class RunResultModal extends PIXI.Container {
  constructor(soundManager = null) {
    super();
    this.soundManager = soundManager;
    this.visible = false;
    this._onContinue = null;
  }

  show(options = {}) {
    const {
      assertionPassed = null,
      assertionName = '',
      actualValue = undefined,
      expectedValue = undefined,
      operator = '',
      stmtCoverage = 0,
      branchCoverage = 0,
      runNumber = 1,
      isLevelComplete = false,
      dungeonWidth = 800,
      dungeonHeight = 600,
    } = options;

    this.removeChildren();
    this.visible = true;

    // Semi-transparent overlay (covers dungeon area only)
    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.75);
    overlay.drawRect(0, 0, dungeonWidth, dungeonHeight);
    overlay.endFill();
    overlay.eventMode = 'static'; // Block clicks
    this.addChild(overlay);

    const panelW = 400;
    const panelH = assertionPassed !== null ? 320 : 260;
    const panel = new Panel(panelW, panelH);
    panel.x = (dungeonWidth - panelW) / 2;
    panel.y = (dungeonHeight - panelH) / 2;

    // Title based on whether level is complete or just a run
    const titleText = isLevelComplete ? 'LEVEL COMPLETE!' : 'RUN COMPLETE';
    const titleColor = isLevelComplete ? 0x44ff44 : 0x44aaff;

    const title = new PIXI.Text(titleText, {
      fontFamily: 'monospace',
      fontSize: 22,
      fontWeight: 'bold',
      fill: titleColor,
      align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = panelW / 2;
    title.y = 16;
    panel.addChild(title);

    // Run number
    const runText = new PIXI.Text(`Run #${runNumber}`, {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0x888899,
    });
    runText.anchor.set(0.5, 0);
    runText.x = panelW / 2;
    runText.y = 44;
    panel.addChild(runText);

    let yOffset = 70;

    // Assertion result (if crystal was used)
    if (assertionPassed !== null) {
      const assertionBg = new PIXI.Graphics();
      if (assertionPassed) {
        assertionBg.beginFill(0x1a3a1a, 0.9);
        assertionBg.lineStyle(2, 0x44ff44);
      } else {
        assertionBg.beginFill(0x3a1a1a, 0.9);
        assertionBg.lineStyle(2, 0xff4444);
      }
      assertionBg.drawRoundedRect(20, yOffset, panelW - 40, 70, 8);
      assertionBg.endFill();
      panel.addChild(assertionBg);

      // Assertion status
      const statusText = assertionPassed ? '✓ ASSERTION PASSED' : '✗ ASSERTION FAILED';
      const statusColor = assertionPassed ? 0x44ff44 : 0xff4444;

      const assertionStatus = new PIXI.Text(statusText, {
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: 'bold',
        fill: statusColor,
      });
      assertionStatus.anchor.set(0.5, 0);
      assertionStatus.x = panelW / 2;
      assertionStatus.y = yOffset + 12;
      panel.addChild(assertionStatus);

      // Assertion details
      let detailText = '';
      if (assertionPassed) {
        detailText = assertionName || 'Crystal assertion satisfied';
      } else {
        const actualStr = this._formatValue(actualValue);
        const expectedStr = this._formatValue(expectedValue);
        detailText = `Expected: ${operator} ${expectedStr}\nGot: ${actualStr}`;
      }

      const assertionDetail = new PIXI.Text(detailText, {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: assertionPassed ? 0xaaffaa : 0xffaaaa,
        align: 'center',
      });
      assertionDetail.anchor.set(0.5, 0);
      assertionDetail.x = panelW / 2;
      assertionDetail.y = yOffset + 38;
      panel.addChild(assertionDetail);

      yOffset += 85;
    }

    // Coverage section
    const coverageTitle = new PIXI.Text('Coverage Progress', {
      fontFamily: 'monospace',
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0xccccee,
    });
    coverageTitle.anchor.set(0.5, 0);
    coverageTitle.x = panelW / 2;
    coverageTitle.y = yOffset;
    panel.addChild(coverageTitle);

    yOffset += 22;

    // Statement coverage
    const stmtLabel = new PIXI.Text(`Statements: ${Math.round(stmtCoverage)}%`, {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0xaaaacc,
    });
    stmtLabel.x = 30;
    stmtLabel.y = yOffset;
    panel.addChild(stmtLabel);

    const stmtBar = new ProgressBar(panelW - 60, 14);
    stmtBar.x = 30;
    stmtBar.y = yOffset + 18;
    stmtBar.setProgress(stmtCoverage / 100);
    panel.addChild(stmtBar);

    yOffset += 40;

    // Branch coverage
    const branchLabel = new PIXI.Text(`Branches: ${Math.round(branchCoverage)}%`, {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0xaaaacc,
    });
    branchLabel.x = 30;
    branchLabel.y = yOffset;
    panel.addChild(branchLabel);

    const branchBar = new ProgressBar(panelW - 60, 14);
    branchBar.x = 30;
    branchBar.y = yOffset + 18;
    branchBar.setProgress(branchCoverage / 100);
    panel.addChild(branchBar);

    yOffset += 50;

    // Continue button
    const btnText = isLevelComplete ? 'Continue' : 'Next Run';
    const continueBtn = new Button(btnText, panelW - 60, 36, this.soundManager);
    continueBtn.x = 30;
    continueBtn.y = yOffset;
    continueBtn.onClick(() => {
      this.hide();
      if (this._onContinue) {
        this._onContinue(isLevelComplete);
      }
    });
    panel.addChild(continueBtn);

    this.addChild(panel);

    // Play sound
    if (this.soundManager) {
      if (isLevelComplete) {
        this.soundManager.play('levelComplete');
      } else if (assertionPassed) {
        this.soundManager.play('gemCollect');
      } else if (assertionPassed === false) {
        this.soundManager.play('error');
      }
    }
  }

  hide() {
    this.visible = false;
    this.removeChildren();
  }

  onContinue(callback) {
    this._onContinue = callback;
  }

  _formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
