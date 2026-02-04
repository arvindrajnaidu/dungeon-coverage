// InputModal: DOM overlay for function parameter input
// Uses HTML inputs over the canvas since PIXI has no native text input

export default class InputModal {
  constructor() {
    this.overlay = null;
    this.onSubmit = null;
    this.visible = false;
  }

  show(paramHints, callback) {
    this.onSubmit = callback;
    this.visible = true;
    this._createOverlay(paramHints);
  }

  hide() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.visible = false;
  }

  _createOverlay(paramHints) {
    // Remove any existing overlay
    this.hide();
    this.visible = true;

    const overlay = document.createElement('div');
    overlay.id = 'input-modal-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; font-family: monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #0f3460; border: 2px solid #533483; border-radius: 12px;
      padding: 24px 32px; min-width: 360px; max-width: 500px;
      color: #e0e0e0; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Enter Function Parameters';
    title.style.cssText = `
      margin: 0 0 16px 0; color: #ffaa44; font-size: 16px;
      text-align: center; font-family: monospace;
    `;
    panel.appendChild(title);

    const inputs = [];

    for (const hint of paramHints) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom: 12px;';

      const label = document.createElement('label');
      label.textContent = `${hint.name}`;
      label.style.cssText = `
        display: block; margin-bottom: 4px; font-size: 13px;
        color: #aaaacc; font-family: monospace;
      `;
      if (hint.type) {
        const typeSpan = document.createElement('span');
        typeSpan.textContent = ` (${hint.type})`;
        typeSpan.style.color = '#666688';
        label.appendChild(typeSpan);
      }
      row.appendChild(label);

      // If presets exist, show preset buttons
      if (hint.presets && hint.presets.length > 0) {
        const presetRow = document.createElement('div');
        presetRow.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = hint.placeholder || '';
        input.dataset.paramName = hint.name;
        input.style.cssText = `
          width: 100%; padding: 8px 10px; background: #1a1a2e; border: 1px solid #533483;
          border-radius: 6px; color: #e0e0e0; font-family: monospace; font-size: 13px;
          outline: none; margin-bottom: 4px;
        `;
        input.addEventListener('focus', () => { input.style.borderColor = '#7a4aaa'; });
        input.addEventListener('blur', () => { input.style.borderColor = '#533483'; });
        row.appendChild(input);

        for (const preset of hint.presets) {
          const btn = document.createElement('button');
          btn.textContent = preset.label;
          btn.style.cssText = `
            padding: 4px 10px; background: #533483; border: none; border-radius: 4px;
            color: #fff; font-family: monospace; font-size: 11px; cursor: pointer;
          `;
          btn.addEventListener('mouseenter', () => { btn.style.background = '#7a4aaa'; });
          btn.addEventListener('mouseleave', () => { btn.style.background = '#533483'; });
          btn.addEventListener('click', () => {
            input.value = preset.value;
          });
          presetRow.appendChild(btn);
        }
        row.appendChild(presetRow);
        inputs.push(input);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = hint.placeholder || '';
        input.dataset.paramName = hint.name;
        input.style.cssText = `
          width: 100%; padding: 8px 10px; background: #1a1a2e; border: 1px solid #533483;
          border-radius: 6px; color: #e0e0e0; font-family: monospace; font-size: 13px;
          outline: none;
        `;
        input.addEventListener('focus', () => { input.style.borderColor = '#7a4aaa'; });
        input.addEventListener('blur', () => { input.style.borderColor = '#533483'; });
        row.appendChild(input);
        inputs.push(input);
      }

      panel.appendChild(row);
    }

    // Run button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'text-align: center; margin-top: 16px;';

    const runBtn = document.createElement('button');
    runBtn.textContent = 'Run';
    runBtn.style.cssText = `
      padding: 10px 40px; background: #533483; border: none; border-radius: 6px;
      color: #fff; font-family: monospace; font-size: 15px; font-weight: bold;
      cursor: pointer; letter-spacing: 1px;
    `;
    runBtn.addEventListener('mouseenter', () => { runBtn.style.background = '#7a4aaa'; });
    runBtn.addEventListener('mouseleave', () => { runBtn.style.background = '#533483'; });
    runBtn.addEventListener('click', () => {
      const values = {};
      for (const input of inputs) {
        const raw = input.value.trim();
        const name = input.dataset.paramName;
        values[name] = this._parseValue(raw);
      }
      this.hide();
      if (this.onSubmit) this.onSubmit(values);
    });
    btnRow.appendChild(runBtn);
    panel.appendChild(btnRow);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Focus first input
    if (inputs.length > 0) {
      setTimeout(() => inputs[0].focus(), 50);
    }
  }

  _parseValue(raw) {
    if (raw === '') return undefined;
    // Try JSON.parse first (handles numbers, arrays, objects, booleans, strings)
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Fallback: try evaluating as expression (for functions, etc.)
      try {
        return new Function('return ' + raw)();
      } catch (e2) {
        // Return as raw string
        return raw;
      }
    }
  }
}
