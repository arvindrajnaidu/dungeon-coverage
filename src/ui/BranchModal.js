// BranchModal: DOM overlay for branch decision display
// Shows the condition text and TRUE/FALSE result at each branch tile

export default class BranchModal {
  constructor() {
    this.overlay = null;
    this.visible = false;
  }

  show(conditionText, result, callback) {
    this.visible = true;
    this._createOverlay(conditionText, result, callback);
  }

  hide() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.visible = false;
  }

  _createOverlay(conditionText, result, callback) {
    this.hide();
    this.visible = true;

    const overlay = document.createElement('div');
    overlay.id = 'branch-modal-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; font-family: monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #0f3460; border: 2px solid #533483; border-radius: 12px;
      padding: 24px 32px; min-width: 320px; max-width: 460px;
      color: #e0e0e0; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      text-align: center;
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Decision Fork';
    title.style.cssText = `
      margin: 0 0 16px 0; color: #ffaa44; font-size: 16px;
      font-family: monospace;
    `;
    panel.appendChild(title);

    // Condition text
    const condEl = document.createElement('div');
    condEl.style.cssText = `
      background: #1a1a2e; border: 1px solid #533483; border-radius: 6px;
      padding: 12px 16px; margin-bottom: 16px; font-size: 14px;
      color: #aaddff; word-break: break-all;
    `;
    condEl.textContent = conditionText;
    panel.appendChild(condEl);

    // Arrow
    const arrow = document.createElement('div');
    arrow.textContent = '\u2193';
    arrow.style.cssText = `
      font-size: 20px; margin-bottom: 12px; color: #888;
    `;
    panel.appendChild(arrow);

    // Result badge
    const resultEl = document.createElement('div');
    const isTrue = !!result;
    resultEl.textContent = isTrue ? 'TRUE' : 'FALSE';
    resultEl.style.cssText = `
      display: inline-block;
      padding: 8px 24px; border-radius: 6px; font-size: 18px; font-weight: bold;
      letter-spacing: 2px;
      background: ${isTrue ? 'rgba(68,255,68,0.15)' : 'rgba(255,68,68,0.15)'};
      color: ${isTrue ? '#44ff44' : '#ff4444'};
      border: 1px solid ${isTrue ? '#44ff44' : '#ff4444'};
      margin-bottom: 20px;
    `;
    panel.appendChild(resultEl);

    // Continue button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top: 8px;';

    const btn = document.createElement('button');
    btn.textContent = 'Continue';
    btn.style.cssText = `
      padding: 10px 40px; background: #533483; border: none; border-radius: 6px;
      color: #fff; font-family: monospace; font-size: 15px; font-weight: bold;
      cursor: pointer; letter-spacing: 1px;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#7a4aaa'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#533483'; });
    btn.addEventListener('click', () => {
      this.hide();
      if (callback) callback();
    });
    btnRow.appendChild(btn);
    panel.appendChild(btnRow);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }
}
