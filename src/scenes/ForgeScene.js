import * as PIXI from 'pixi.js';
import WeaponInventory from '../game/WeaponInventory.js';

export default class ForgeScene {
  constructor(sceneManager, weaponInventory, soundManager = null) {
    this.sceneManager = sceneManager;
    this.weaponInventory = weaponInventory;
    this.soundManager = soundManager;
    this.container = new PIXI.Container();
    this.overlay = null;
    this.selectedType = 'number';
    this.returnData = null;

    // Form elements for editing
    this.formElements = null;
    this.editingWeaponId = null;
  }

  async enter(data = {}) {
    this.returnData = data.returnTo ? data : null;
    this.container.removeChildren();
    this._createOverlay();
  }

  exit() {
    this._removeOverlay();
    this.editingWeaponId = null;
    this.formElements = null;
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
      padding: 24px 32px; width: 800px; max-height: 85vh;
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
      { key: 'json', label: 'JSON', color: '#cc66ff' },
      { key: 'stub', label: 'Stub', color: '#66ffcc' },
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

    // Value input (textarea for larger inputs like JSON)
    const valueLabel = document.createElement('div');
    valueLabel.textContent = 'Value';
    valueLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-top: 4px;';
    craftPanel.appendChild(valueLabel);

    const valueInput = document.createElement('textarea');
    valueInput.placeholder = 'Enter a number';
    valueInput.rows = 4;
    valueInput.style.cssText = `
      width: 100%; padding: 8px 10px; background: #1a1a2e; border: 1px solid #533483;
      border-radius: 6px; color: #e0e0e0; font-family: monospace; font-size: 13px;
      outline: none; box-sizing: border-box; resize: vertical; min-height: 80px;
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

    // Forge/Update button
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
      if (this.editingWeaponId) {
        // Update existing weapon
        const result = this._updateWeapon(this.editingWeaponId, valueInput.value.trim(), nameInput.value.trim(), errorMsg);
        if (result) {
          this._clearEditMode();
          this._renderInventoryList(invList);
        }
      } else {
        // Create new weapon
        const result = this._forgeWeapon(valueInput.value.trim(), nameInput.value.trim(), errorMsg);
        if (result) {
          valueInput.value = '';
          nameInput.value = '';
          this._renderInventoryList(invList);
        }
      }
    });
    craftPanel.appendChild(forgeBtn);

    // Cancel edit button (hidden by default)
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.style.cssText = `
      padding: 8px 16px; background: transparent; border: 1px solid #664444;
      border-radius: 6px; color: #aa6666; font-family: monospace; font-size: 12px;
      cursor: pointer; margin-top: 4px; display: none;
    `;
    cancelBtn.addEventListener('click', () => {
      this._clearEditMode();
    });
    craftPanel.appendChild(cancelBtn);

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
      max-height: 320px; padding-right: 8px;
    `;
    // Add custom scrollbar styling
    invList.classList.add('forge-inv-list');
    const style = document.createElement('style');
    style.textContent = `
      .forge-inv-list::-webkit-scrollbar {
        width: 8px;
      }
      .forge-inv-list::-webkit-scrollbar-track {
        background: #1a1a2e;
        border-radius: 4px;
      }
      .forge-inv-list::-webkit-scrollbar-thumb {
        background: #533483;
        border-radius: 4px;
      }
      .forge-inv-list::-webkit-scrollbar-thumb:hover {
        background: #7a4aaa;
      }
    `;
    overlay.appendChild(style);
    invPanel.appendChild(invList);

    content.appendChild(invPanel);

    // Store form elements for editing (must be after invList is created)
    this.formElements = {
      valueInput,
      nameInput,
      errorMsg,
      forgeBtn,
      cancelBtn,
      typeBtns,
      types,
      invList,
    };
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
      case 'json':    valueInput.placeholder = 'e.g. {"name": "hero", "level": 5}'; break;
      case 'stub':    valueInput.placeholder = 'JS expression: {ok: true}, "text", 42, or empty'; break;
    }
  }

  _updateAutoName(nameInput, valueInput) {
    // Don't auto-update name when editing an existing weapon
    if (this.editingWeaponId) return;

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
      case 'json': {
        try {
          const obj = JSON.parse(raw);
          if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            return { error: 'Enter a JSON object (use {} format)' };
          }
          return { value: obj };
        } catch (e) {
          return { error: 'Not valid JSON' };
        }
      }
      case 'stub': {
        // Stub can have an optional return value
        // Empty = returns undefined, otherwise evaluate as JavaScript code
        if (raw === '') {
          return { value: { __stub: true, returns: undefined } };
        }
        // Evaluate as JavaScript expression
        try {
          // Use Function constructor to safely evaluate the expression
          const evalFn = new Function('return (' + raw + ')');
          const result = evalFn();
          return { value: { __stub: true, returns: result } };
        } catch (e) {
          return { error: `Invalid JS: ${e.message}` };
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
      if (this.soundManager) {
        this.soundManager.play('error');
      }
      return false;
    }
    this.weaponInventory.add(this.selectedType, parsed.value, name || undefined);
    if (this.soundManager) {
      this.soundManager.play('forgeCreate');
    }
    return true;
  }

  _updateWeapon(weaponId, rawValue, name, errorMsg) {
    errorMsg.textContent = '';
    const parsed = this._parseForType(this.selectedType, rawValue);
    if (parsed.error) {
      errorMsg.textContent = parsed.error;
      if (this.soundManager) {
        this.soundManager.play('error');
      }
      return false;
    }
    this.weaponInventory.update(weaponId, this.selectedType, parsed.value, name || undefined);
    if (this.soundManager) {
      this.soundManager.play('forgeCreate');
    }
    return true;
  }

  _editWeapon(weapon) {
    this.editingWeaponId = weapon.id;
    this.selectedType = weapon.type;

    // Update type buttons
    this._updateTypeButtons(this.formElements.typeBtns, this.formElements.types);
    this._updateValuePlaceholder(this.formElements.valueInput);

    // Populate value field
    this.formElements.valueInput.value = this._valueToRaw(weapon.type, weapon.value);
    this.formElements.nameInput.value = weapon.name;
    this.formElements.errorMsg.textContent = '';

    // Update button states
    this.formElements.forgeBtn.textContent = 'UPDATE';
    this.formElements.cancelBtn.style.display = 'block';

    // Focus value input
    this.formElements.valueInput.focus();

    // Re-render to highlight editing item
    this._renderInventoryList(this.formElements.invList);
  }

  _clearEditMode() {
    this.editingWeaponId = null;
    this.formElements.valueInput.value = '';
    this.formElements.nameInput.value = '';
    this.formElements.errorMsg.textContent = '';
    this.formElements.forgeBtn.textContent = 'FORGE';
    this.formElements.cancelBtn.style.display = 'none';
    this._renderInventoryList(this.formElements.invList);
  }

  _cloneWeapon(weapon) {
    // Deep clone the value to avoid reference issues
    const clonedValue = JSON.parse(JSON.stringify(weapon.value));

    // Generate a new name with "(copy)" suffix
    let newName = weapon.name + ' (copy)';

    // Add to inventory
    this.weaponInventory.add(weapon.type, clonedValue, newName);

    if (this.soundManager) {
      this.soundManager.play('forgeCreate');
    }
  }

  _valueToJsString(value) {
    // Convert a value to JavaScript-style string (not JSON)
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return '[' + value.map(v => this._valueToJsString(v)).join(', ') + ']';
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value).map(([k, v]) => {
        // Use unquoted keys if they're valid identifiers
        const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        return `${key}: ${this._valueToJsString(v)}`;
      });
      return '{' + entries.join(', ') + '}';
    }
    return String(value);
  }

  _valueToRaw(type, value) {
    switch (type) {
      case 'number':
        return String(value);
      case 'string':
        return value;
      case 'boolean':
        return String(value);
      case 'array':
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'stub':
        if (value?.returns === undefined) return '';
        // Convert back to JavaScript-style format
        return this._valueToJsString(value.returns);
      default:
        return String(value);
    }
  }

  _formatDisplayValue(weapon) {
    if (weapon.type === 'stub') {
      const ret = weapon.value?.returns;
      if (ret === undefined) return 'stub()';
      return `stub() → ${this._valueToJsString(ret)}`;
    }
    if (weapon.type === 'array' || weapon.type === 'json') {
      return this._valueToJsString(weapon.value);
    }
    return String(weapon.value);
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
      const valStr = this._formatDisplayValue(w);
      info.textContent = `${w.name}`;
      info.title = `${w.name} = ${valStr}`;
      row.appendChild(info);

      // Value badge
      const valBadge = document.createElement('span');
      valBadge.textContent = valStr;
      valBadge.style.cssText = `
        font-size: 10px; color: #888; max-width: 80px; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0;
      `;
      row.appendChild(valBadge);

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.textContent = '✎';
      editBtn.title = 'Edit';
      editBtn.style.cssText = `
        background: transparent; border: 1px solid #335555; border-radius: 3px;
        color: #66aaaa; font-family: monospace; font-size: 11px; cursor: pointer;
        padding: 1px 6px; flex-shrink: 0;
      `;
      editBtn.addEventListener('click', () => {
        this._editWeapon(w);
      });
      row.appendChild(editBtn);

      // Clone button
      const cloneBtn = document.createElement('button');
      cloneBtn.textContent = '⧉';
      cloneBtn.title = 'Clone';
      cloneBtn.style.cssText = `
        background: transparent; border: 1px solid #445533; border-radius: 3px;
        color: #88aa66; font-family: monospace; font-size: 11px; cursor: pointer;
        padding: 1px 6px; flex-shrink: 0;
      `;
      cloneBtn.addEventListener('click', () => {
        this._cloneWeapon(w);
        this._renderInventoryList(listEl);
      });
      row.appendChild(cloneBtn);

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
        if (this.editingWeaponId === w.id) {
          this._clearEditMode();
        } else {
          this._renderInventoryList(listEl);
        }
      });
      row.appendChild(delBtn);

      // Highlight if currently editing
      if (this.editingWeaponId === w.id) {
        row.style.border = '1px solid #7a4aaa';
        row.style.background = '#2a2a4e';
      }

      listEl.appendChild(row);
    }
  }
}
