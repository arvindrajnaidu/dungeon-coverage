import * as PIXI from 'pixi.js';
import WeaponInventory from '../game/WeaponInventory.js';

export default class ForgeScene {
  constructor(sceneManager, weaponInventory) {
    this.sceneManager = sceneManager;
    this.weaponInventory = weaponInventory;
    this.container = new PIXI.Container();
    this.overlay = null;
    this.selectedType = 'number';
    this.returnData = null;
  }

  async enter(data = {}) {
    this.returnData = data.returnTo ? data : null;
    this.container.removeChildren();
    this._createOverlay();
  }

  exit() {
    this._removeOverlay();
  }

  update() {}

  getContainer() {
    return this.container;
  }

  _removeOverlay() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }

  _createOverlay() {
    this._removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'forge-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; font-family: monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #0f3460; border: 2px solid #533483; border-radius: 12px;
      padding: 24px 32px; width: 640px; max-height: 80vh;
      color: #e0e0e0; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      display: flex; flex-direction: column;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'THE FORGE';
    title.style.cssText = `
      margin: 0 0 20px 0; color: #ffaa44; font-size: 24px;
      text-align: center; font-family: monospace; letter-spacing: 4px;
    `;
    panel.appendChild(title);

    // Main content: left crafting, right inventory
    const content = document.createElement('div');
    content.style.cssText = `
      display: flex; gap: 24px; flex: 1; min-height: 0;
    `;

    // --- Left side: Crafting form ---
    const craftPanel = document.createElement('div');
    craftPanel.style.cssText = `
      flex: 1; display: flex; flex-direction: column; gap: 12px;
    `;

    // Type selector
    const typeLabel = document.createElement('div');
    typeLabel.textContent = 'Type';
    typeLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-bottom: 2px;';
    craftPanel.appendChild(typeLabel);

    const typeRow = document.createElement('div');
    typeRow.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';

    const types = [
      { key: 'number', label: 'Number', color: '#44aaff' },
      { key: 'string', label: 'String', color: '#44ff88' },
      { key: 'boolean', label: 'Boolean', color: '#ff6644' },
      { key: 'array', label: 'Array', color: '#ffaa44' },
    ];
    const typeBtns = {};

    for (const t of types) {
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.dataset.type = t.key;
      btn.style.cssText = `
        padding: 6px 14px; border: 2px solid ${t.color}; border-radius: 4px;
        background: transparent; color: ${t.color}; font-family: monospace;
        font-size: 12px; cursor: pointer; transition: background 0.15s;
      `;
      btn.addEventListener('click', () => {
        this.selectedType = t.key;
        this._updateTypeButtons(typeBtns, types);
        this._updateAutoName(nameInput, valueInput);
        this._updateValuePlaceholder(valueInput);
      });
      typeRow.appendChild(btn);
      typeBtns[t.key] = btn;
    }
    craftPanel.appendChild(typeRow);

    // Value input
    const valueLabel = document.createElement('div');
    valueLabel.textContent = 'Value';
    valueLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-top: 4px;';
    craftPanel.appendChild(valueLabel);

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Enter a number';
    valueInput.style.cssText = `
      width: 100%; padding: 8px 10px; background: #1a1a2e; border: 1px solid #533483;
      border-radius: 6px; color: #e0e0e0; font-family: monospace; font-size: 13px;
      outline: none; box-sizing: border-box;
    `;
    valueInput.addEventListener('focus', () => { valueInput.style.borderColor = '#7a4aaa'; });
    valueInput.addEventListener('blur', () => { valueInput.style.borderColor = '#533483'; });
    valueInput.addEventListener('input', () => {
      this._updateAutoName(nameInput, valueInput);
    });
    craftPanel.appendChild(valueInput);

    // Name input
    const nameLabel = document.createElement('div');
    nameLabel.textContent = 'Name (auto-filled)';
    nameLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-top: 4px;';
    craftPanel.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Weapon name';
    nameInput.style.cssText = `
      width: 100%; padding: 8px 10px; background: #1a1a2e; border: 1px solid #533483;
      border-radius: 6px; color: #e0e0e0; font-family: monospace; font-size: 13px;
      outline: none; box-sizing: border-box;
    `;
    nameInput.addEventListener('focus', () => { nameInput.style.borderColor = '#7a4aaa'; });
    nameInput.addEventListener('blur', () => { nameInput.style.borderColor = '#533483'; });
    craftPanel.appendChild(nameInput);

    // Error message area
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'font-size: 11px; color: #ff6644; min-height: 16px;';
    craftPanel.appendChild(errorMsg);

    // Forge button
    const forgeBtn = document.createElement('button');
    forgeBtn.textContent = 'FORGE';
    forgeBtn.style.cssText = `
      padding: 10px 20px; background: #533483; border: 2px solid #7a4aaa;
      border-radius: 6px; color: #fff; font-family: monospace; font-size: 15px;
      font-weight: bold; cursor: pointer; letter-spacing: 2px; margin-top: 4px;
    `;
    forgeBtn.addEventListener('mouseenter', () => { forgeBtn.style.background = '#7a4aaa'; });
    forgeBtn.addEventListener('mouseleave', () => { forgeBtn.style.background = '#533483'; });
    forgeBtn.addEventListener('click', () => {
      const result = this._forgeWeapon(valueInput.value.trim(), nameInput.value.trim(), errorMsg);
      if (result) {
        valueInput.value = '';
        nameInput.value = '';
        this._renderInventoryList(invList);
      }
    });
    craftPanel.appendChild(forgeBtn);

    content.appendChild(craftPanel);

    // --- Right side: Inventory list ---
    const invPanel = document.createElement('div');
    invPanel.style.cssText = `
      flex: 1; display: flex; flex-direction: column; gap: 8px;
    `;

    const invTitle = document.createElement('div');
    invTitle.textContent = 'Inventory';
    invTitle.style.cssText = 'font-size: 14px; color: #ffaa44; font-weight: bold;';
    invPanel.appendChild(invTitle);

    const invList = document.createElement('div');
    invList.style.cssText = `
      flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
      max-height: 320px; padding-right: 4px;
    `;
    invPanel.appendChild(invList);

    content.appendChild(invPanel);
    panel.appendChild(content);

    // Bottom: Back button
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'text-align: center; margin-top: 20px;';

    const backBtn = document.createElement('button');
    backBtn.textContent = this.returnData ? 'Back to Level' : 'Back to Menu';
    backBtn.style.cssText = `
      padding: 8px 28px; background: transparent; border: 1px solid #533483;
      border-radius: 6px; color: #aaaacc; font-family: monospace; font-size: 13px;
      cursor: pointer;
    `;
    backBtn.addEventListener('mouseenter', () => { backBtn.style.borderColor = '#7a4aaa'; backBtn.style.color = '#fff'; });
    backBtn.addEventListener('mouseleave', () => { backBtn.style.borderColor = '#533483'; backBtn.style.color = '#aaaacc'; });
    backBtn.addEventListener('click', () => {
      if (this.returnData && this.returnData.returnTo === 'level') {
        this.sceneManager.switchTo('level', { levelIndex: this.returnData.levelIndex, _replay: true });
      } else {
        this.sceneManager.switchTo('title');
      }
    });
    bottomRow.appendChild(backBtn);
    panel.appendChild(bottomRow);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Initialize state
    this._updateTypeButtons(typeBtns, types);
    this._renderInventoryList(invList);

    setTimeout(() => valueInput.focus(), 50);
  }

  _updateTypeButtons(btns, types) {
    for (const t of types) {
      const btn = btns[t.key];
      if (t.key === this.selectedType) {
        btn.style.background = t.color;
        btn.style.color = '#000';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = t.color;
      }
    }
  }

  _updateValuePlaceholder(valueInput) {
    switch (this.selectedType) {
      case 'number':  valueInput.placeholder = 'Enter a number (e.g. 15)'; break;
      case 'string':  valueInput.placeholder = 'Enter a string (e.g. hello)'; break;
      case 'boolean': valueInput.placeholder = 'true or false'; break;
      case 'array':   valueInput.placeholder = 'e.g. [1, 2, 3]'; break;
    }
  }

  _updateAutoName(nameInput, valueInput) {
    const raw = valueInput.value.trim();
    if (!raw) {
      nameInput.value = '';
      return;
    }
    const parsed = this._parseForType(this.selectedType, raw);
    if (parsed.error) return;
    nameInput.value = this.weaponInventory.generateName(this.selectedType, parsed.value);
  }

  _parseForType(type, raw) {
    if (raw === '') return { error: 'Value is required' };

    switch (type) {
      case 'number': {
        const n = Number(raw);
        if (isNaN(n)) return { error: 'Not a valid number' };
        return { value: n };
      }
      case 'string':
        return { value: raw };
      case 'boolean': {
        const lower = raw.toLowerCase();
        if (lower === 'true') return { value: true };
        if (lower === 'false') return { value: false };
        return { error: 'Enter true or false' };
      }
      case 'array': {
        try {
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) return { error: 'Not a valid array (use [1,2,3] format)' };
          return { value: arr };
        } catch (e) {
          return { error: 'Not valid JSON array' };
        }
      }
      default:
        return { error: 'Unknown type' };
    }
  }

  _forgeWeapon(rawValue, name, errorMsg) {
    errorMsg.textContent = '';
    const parsed = this._parseForType(this.selectedType, rawValue);
    if (parsed.error) {
      errorMsg.textContent = parsed.error;
      return false;
    }
    this.weaponInventory.add(this.selectedType, parsed.value, name || undefined);
    return true;
  }

  _renderInventoryList(listEl) {
    listEl.innerHTML = '';
    const weapons = this.weaponInventory.getAll();

    if (weapons.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No weapons yet. Forge some!';
      empty.style.cssText = 'color: #666688; font-size: 12px; text-align: center; padding: 20px 0;';
      listEl.appendChild(empty);
      return;
    }

    for (const w of weapons) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; gap: 8px; padding: 6px 8px;
        background: #1a1a2e; border-radius: 4px; border: 1px solid #333355;
      `;

      // Color dot icon
      const dot = document.createElement('span');
      dot.style.cssText = `
        display: inline-block; width: 12px; height: 12px; border-radius: 2px;
        background: #${w.color.toString(16).padStart(6, '0')};
        flex-shrink: 0;
      `;
      row.appendChild(dot);

      // Name + value
      const info = document.createElement('span');
      info.style.cssText = 'flex: 1; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      const valStr = w.type === 'array' ? JSON.stringify(w.value) : String(w.value);
      info.textContent = `${w.name}`;
      info.title = `${w.name} = ${valStr}`;
      row.appendChild(info);

      // Value badge
      const valBadge = document.createElement('span');
      valBadge.textContent = w.type === 'array' ? JSON.stringify(w.value) : String(w.value);
      valBadge.style.cssText = `
        font-size: 10px; color: #888; max-width: 80px; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0;
      `;
      row.appendChild(valBadge);

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = 'x';
      delBtn.style.cssText = `
        background: transparent; border: 1px solid #553333; border-radius: 3px;
        color: #ff6644; font-family: monospace; font-size: 11px; cursor: pointer;
        padding: 1px 6px; flex-shrink: 0;
      `;
      delBtn.addEventListener('click', () => {
        this.weaponInventory.remove(w.id);
        this._renderInventoryList(listEl);
      });
      row.appendChild(delBtn);

      listEl.appendChild(row);
    }
  }
}
