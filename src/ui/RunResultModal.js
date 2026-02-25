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
      executionSnapshot = null,
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

    // Calculate panel height based on snapshot content
    const hasSnapshot = executionSnapshot !== null;
    const panelW = 420;
    const panelH = hasSnapshot ? 380 : 260;
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

    // Execution snapshot section
    if (hasSnapshot) {
      const snapshotBg = new PIXI.Graphics();
      snapshotBg.beginFill(0x1a2a3a, 0.9);
      snapshotBg.lineStyle(2, 0x4488cc);
      snapshotBg.drawRoundedRect(20, yOffset, panelW - 40, 130, 8);
      snapshotBg.endFill();
      panel.addChild(snapshotBg);

      // Snapshot title
      const snapshotTitle = new PIXI.Text('📸 Execution Snapshot', {
        fontFamily: 'monospace',
        fontSize: 13,
        fontWeight: 'bold',
        fill: 0x66aaff,
      });
      snapshotTitle.x = 30;
      snapshotTitle.y = yOffset + 8;
      panel.addChild(snapshotTitle);

      // Build snapshot JSON preview
      const snapshotData = {
        result: executionSnapshot.result,
        error: executionSnapshot.error ? String(executionSnapshot.error) : null,
        stubs: executionSnapshot.stubDump || {},
      };

      // Format as compact JSON for display
      let snapshotJson = JSON.stringify(snapshotData, null, 1);
      // Truncate if too long
      if (snapshotJson.length > 180) {
        snapshotJson = snapshotJson.substring(0, 177) + '...';
      }

      const snapshotText = new PIXI.Text(snapshotJson, {
        fontFamily: 'monospace',
        fontSize: 9,
        fill: 0xaaccee,
        wordWrap: true,
        wordWrapWidth: panelW - 60,
      });
      snapshotText.x = 30;
      snapshotText.y = yOffset + 28;
      panel.addChild(snapshotText);

      // Save as Snapshot button (placeholder for now)
      const saveBtn = new Button('Save Snapshot', 120, 28, this.soundManager);
      saveBtn.x = panelW - 150;
      saveBtn.y = yOffset + 95;
      saveBtn.onClick(() => {
        console.log('%c[Snapshot] Saving snapshot:', 'color: #66aaff;', snapshotData);
        // TODO: Implement snapshot saving
        alert('Snapshot saved! (To be implemented)');
      });
      panel.addChild(saveBtn);

      yOffset += 145;
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
      } else {
        this.soundManager.play('gemCollect');
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
