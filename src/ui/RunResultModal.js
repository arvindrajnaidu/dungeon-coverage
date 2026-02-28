import * as PIXI from 'pixi.js';

export default class RunResultModal extends PIXI.Container {
  constructor(soundManager = null) {
    super();
    this.soundManager = soundManager;
    this.visible = false;
    this._onContinue = null;
    this._onSaveTest = null;
    this._overlay = null;
  }

  show(options = {}) {
    const {
      executionSnapshot = null,
      stmtCoverage = 0,
      branchCoverage = 0,
      runNumber = 1,
      isLevelComplete = false,
    } = options;

    this.hide();
    this.visible = true;

    // Build the entire modal as a DOM overlay
    const overlay = document.createElement('div');
    overlay.id = 'run-result-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; font-family: monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #0f1a2e; border: 2px solid #334466; border-radius: 12px;
      padding: 28px 32px; width: 500px;
      color: #e0e0e0; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    `;

    // Title
    const titleColor = isLevelComplete ? '#44ff44' : '#44aaff';
    const titleText = isLevelComplete ? 'LEVEL COMPLETE!' : 'RUN COMPLETE';
    const title = document.createElement('div');
    title.textContent = titleText;
    title.style.cssText = `
      text-align: center; font-size: 20px; font-weight: bold;
      color: ${titleColor}; margin-bottom: 4px;
    `;
    panel.appendChild(title);

    // Run number
    const runLabel = document.createElement('div');
    runLabel.textContent = `Run #${runNumber}`;
    runLabel.style.cssText = `
      text-align: center; font-size: 12px; color: #888899; margin-bottom: 16px;
    `;
    panel.appendChild(runLabel);

    // Snapshot section
    if (executionSnapshot) {
      const snapshotData = {
        result: executionSnapshot.result,
        error: executionSnapshot.error ? String(executionSnapshot.error) : null,
        stubs: executionSnapshot.stubDump || {},
      };

      let snapshotJson;
      try {
        snapshotJson = JSON.stringify(snapshotData, null, 2);
      } catch (e) {
        snapshotJson = `{ "error": "Could not serialize: ${e.message}" }`;
      }

      const snapshotSection = document.createElement('div');
      snapshotSection.style.cssText = `
        margin-bottom: 16px; border: 1px solid #4488cc; border-radius: 8px;
        padding: 10px; background: #1a2a3a;
      `;

      const snapshotTitle = document.createElement('div');
      snapshotTitle.textContent = 'Execution Snapshot';
      snapshotTitle.style.cssText = `
        font-size: 13px; font-weight: bold; color: #66aaff; margin-bottom: 8px;
      `;
      snapshotSection.appendChild(snapshotTitle);

      const textarea = document.createElement('textarea');
      textarea.readOnly = true;
      textarea.spellcheck = false;
      textarea.style.cssText = `
        width: 100%; height: 160px; box-sizing: border-box;
        font-family: monospace; font-size: 11px; color: #aaccee;
        background: #0d1b2a; border: 1px solid #334466; border-radius: 4px;
        outline: none; resize: vertical; padding: 8px; line-height: 1.4;
      `;
      snapshotSection.appendChild(textarea);
      // Set value after adding to DOM
      requestAnimationFrame(() => { textarea.value = snapshotJson || '{}'; });

      panel.appendChild(snapshotSection);
    }

    // Coverage section
    const coverageSection = document.createElement('div');
    coverageSection.style.cssText = 'margin-bottom: 16px;';

    const coverageTitle = document.createElement('div');
    coverageTitle.textContent = 'Coverage Progress';
    coverageTitle.style.cssText = `
      text-align: center; font-size: 13px; font-weight: bold;
      color: #ccccee; margin-bottom: 10px;
    `;
    coverageSection.appendChild(coverageTitle);

    coverageSection.appendChild(this._createBarRow('Statements', stmtCoverage));
    coverageSection.appendChild(this._createBarRow('Branches', branchCoverage));

    panel.appendChild(coverageSection);

    // Save as Test button
    if (executionSnapshot) {
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save as Test';
      saveBtn.style.cssText = `
        display: block; width: 100%; padding: 10px; margin-bottom: 8px;
        border: none; border-radius: 6px;
        background: #2a7a44; color: #fff; font-family: monospace;
        font-size: 14px; font-weight: bold; cursor: pointer; letter-spacing: 1px;
      `;
      saveBtn.addEventListener('mouseenter', () => { if (!saveBtn.disabled) saveBtn.style.background = '#33995533'; });
      saveBtn.addEventListener('mouseleave', () => { if (!saveBtn.disabled) saveBtn.style.background = '#2a7a44'; });
      saveBtn.addEventListener('click', () => {
        if (this._onSaveTest) {
          this._onSaveTest();
          saveBtn.textContent = 'Saved!';
          saveBtn.style.background = '#1a5530';
          saveBtn.disabled = true;
          saveBtn.style.cursor = 'default';
        }
      });
      panel.appendChild(saveBtn);
    }

    // Continue button
    const btnText = isLevelComplete ? 'Continue' : 'Next Run';
    const btn = document.createElement('button');
    btn.textContent = btnText;
    btn.style.cssText = `
      display: block; width: 100%; padding: 10px; border: none; border-radius: 6px;
      background: #335588; color: #fff; font-family: monospace;
      font-size: 14px; font-weight: bold; cursor: pointer; letter-spacing: 1px;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#4477aa'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#335588'; });
    btn.addEventListener('click', () => {
      this.hide();
      if (this._onContinue) {
        this._onContinue(isLevelComplete);
      }
    });
    panel.appendChild(btn);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this._overlay = overlay;

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
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
  }

  onContinue(callback) {
    this._onContinue = callback;
  }

  onSaveTest(callback) {
    this._onSaveTest = callback;
  }

  _createBarRow(label, percent) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 8px;';

    const text = document.createElement('div');
    text.textContent = `${label}: ${Math.round(percent)}%`;
    text.style.cssText = 'font-size: 11px; color: #aaaacc; margin-bottom: 4px;';
    row.appendChild(text);

    const barBg = document.createElement('div');
    barBg.style.cssText = `
      width: 100%; height: 14px; background: #1a1a2e;
      border-radius: 7px; overflow: hidden;
    `;

    const barFill = document.createElement('div');
    const clamped = Math.max(0, Math.min(100, percent));
    const color = clamped >= 80 ? '#44ff44' : clamped >= 50 ? '#ffaa44' : '#ff4444';
    barFill.style.cssText = `
      width: ${clamped}%; height: 100%; background: ${color};
      border-radius: 7px; transition: width 0.3s ease;
    `;
    barBg.appendChild(barFill);
    row.appendChild(barBg);

    return row;
  }
}
