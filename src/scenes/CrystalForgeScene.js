import * as PIXI from 'pixi.js';
import CrystalInventory, { RUNES } from '../game/CrystalInventory.js';

export default class CrystalForgeScene {
  constructor(sceneManager, crystalInventory, soundManager = null) {
    this.sceneManager = sceneManager;
    this.crystalInventory = crystalInventory;
    this.soundManager = soundManager;
    this.container = new PIXI.Container();
    this.overlay = null;
    this.selectedRune = 'mirrors';
    this.returnData = null;

    // Form elements for editing
    this.formElements = null;
    this.editingCrystalId = null;
  }

  async enter(data = {}) {
    this.returnData = data.returnTo ? data : null;
    this.container.removeChildren();
    this._createOverlay();
  }

  exit() {
    this._removeOverlay();
    this.editingCrystalId = null;
    this.formElements = null;
  }

  update() {}

  getContainer() {
    return this.container;
  }

  _removeOverlay() {
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }

  _closeModal() {
    if (this.returnData && this.returnData.returnTo === 'level') {
      this.sceneManager.switchTo('level', { levelIndex: this.returnData.levelIndex, _replay: true });
    } else {
      this.sceneManager.switchTo('title');
    }
  }

  _createOverlay() {
    this._removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'crystal-forge-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,20,0.9);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; font-family: monospace;
    `;

    // Click outside panel to close
    overlay.addEventListener('click', () => this._closeModal());

    // Escape key to close
    this._escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this._closeModal();
      }
    };
    document.addEventListener('keydown', this._escapeHandler);

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #1a1a3e; border: 2px solid #6644aa; border-radius: 12px;
      padding: 24px 32px; width: 800px; max-height: 85vh;
      color: #e0e0e0; box-shadow: 0 8px 32px rgba(100,50,200,0.3);
      display: flex; flex-direction: column; position: relative;
    `;

    // Prevent clicks on panel from closing the modal
    panel.addEventListener('click', (e) => e.stopPropagation());

    // Close button (X) in top right
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute; top: 12px; right: 12px; width: 32px; height: 32px;
      background: transparent; border: 1px solid #554477; border-radius: 6px;
      color: #8866aa; font-size: 24px; line-height: 28px; cursor: pointer;
      font-family: sans-serif;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.borderColor = '#8866cc'; closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.borderColor = '#554477'; closeBtn.style.color = '#8866aa'; });
    closeBtn.addEventListener('click', () => this._closeModal());
    panel.appendChild(closeBtn);

    // Title
    const title = document.createElement('h2');
    title.textContent = '🔮 CRYSTAL FORGE';
    title.style.cssText = `
      margin: 0 0 20px 0; color: #aa88ff; font-size: 24px;
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

    // Rune selector
    const runeLabel = document.createElement('div');
    runeLabel.textContent = 'Choose Rune (Operator)';
    runeLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-bottom: 2px;';
    craftPanel.appendChild(runeLabel);

    const runeRow = document.createElement('div');
    runeRow.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';

    const runeKeys = Object.keys(RUNES);
    const runeBtns = {};

    for (const key of runeKeys) {
      const rune = RUNES[key];
      const btn = document.createElement('button');
      btn.textContent = rune.label;
      btn.title = `${rune.preview} (${rune.operator})`;
      btn.dataset.rune = key;
      const colorHex = '#' + rune.color.toString(16).padStart(6, '0');
      btn.style.cssText = `
        padding: 6px 12px; border: 2px solid ${colorHex}; border-radius: 4px;
        background: transparent; color: ${colorHex}; font-family: monospace;
        font-size: 11px; cursor: pointer; transition: background 0.15s;
      `;
      btn.addEventListener('click', () => {
        this.selectedRune = key;
        this._updateRuneButtons(runeBtns);
        this._updateEssenceVisibility(essenceContainer);
        this._updateAutoName(nameInput, essenceInput);
        this._updatePreview(previewText, essenceInput, previewLabel);
      });
      runeRow.appendChild(btn);
      runeBtns[key] = btn;
    }
    craftPanel.appendChild(runeRow);

    // Essence input container
    const essenceContainer = document.createElement('div');
    essenceContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    const essenceLabel = document.createElement('div');
    essenceLabel.textContent = 'Set Essence (Value)';
    essenceLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-top: 8px;';
    essenceContainer.appendChild(essenceLabel);

    const essenceInput = document.createElement('textarea');
    essenceInput.placeholder = 'Enter expected value (e.g., 5, "hello", true)';
    essenceInput.rows = 3;
    essenceInput.style.cssText = `
      width: 100%; padding: 8px 10px; background: #0d0d1a; border: 1px solid #6644aa;
      border-radius: 6px; color: #e0e0e0; font-family: monospace; font-size: 13px;
      outline: none; box-sizing: border-box; resize: vertical; min-height: 60px;
    `;
    essenceInput.addEventListener('focus', () => { essenceInput.style.borderColor = '#8866cc'; });
    essenceInput.addEventListener('blur', () => { essenceInput.style.borderColor = '#6644aa'; });
    essenceInput.addEventListener('input', () => {
      this._updateAutoName(nameInput, essenceInput);
      this._updatePreview(previewText, essenceInput, previewLabel);
    });
    essenceContainer.appendChild(essenceInput);
    craftPanel.appendChild(essenceContainer);

    // Assertion preview
    const previewLabel = document.createElement('div');
    previewLabel.textContent = 'Assertion';
    previewLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-top: 8px;';
    craftPanel.appendChild(previewLabel);

    const previewText = document.createElement('div');
    previewText.style.cssText = `
      padding: 10px; background: #0d0d1a; border-radius: 6px;
      color: #aa88ff; font-size: 14px; font-style: italic;
    `;
    previewText.textContent = '🔮 Result mirrors ...';
    craftPanel.appendChild(previewText);

    // Name input
    const nameLabel = document.createElement('div');
    nameLabel.textContent = 'Name (auto-filled)';
    nameLabel.style.cssText = 'font-size: 12px; color: #aaaacc; margin-top: 8px;';
    craftPanel.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Crystal name';
    nameInput.style.cssText = `
      width: 100%; padding: 8px 10px; background: #0d0d1a; border: 1px solid #6644aa;
      border-radius: 6px; color: #e0e0e0; font-family: monospace; font-size: 13px;
      outline: none; box-sizing: border-box;
    `;
    nameInput.addEventListener('focus', () => { nameInput.style.borderColor = '#8866cc'; });
    nameInput.addEventListener('blur', () => { nameInput.style.borderColor = '#6644aa'; });
    craftPanel.appendChild(nameInput);

    // Error message area
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'font-size: 11px; color: #ff6644; min-height: 16px;';
    craftPanel.appendChild(errorMsg);

    // Forge button
    const forgeBtn = document.createElement('button');
    forgeBtn.textContent = 'FORGE CRYSTAL';
    forgeBtn.style.cssText = `
      padding: 10px 20px; background: #6644aa; border: 2px solid #8866cc;
      border-radius: 6px; color: #fff; font-family: monospace; font-size: 15px;
      font-weight: bold; cursor: pointer; letter-spacing: 2px; margin-top: 4px;
    `;
    forgeBtn.addEventListener('mouseenter', () => { forgeBtn.style.background = '#8866cc'; });
    forgeBtn.addEventListener('mouseleave', () => { forgeBtn.style.background = '#6644aa'; });
    forgeBtn.addEventListener('click', () => {
      if (this.editingCrystalId) {
        const result = this._updateCrystal(this.editingCrystalId, essenceInput.value.trim(), nameInput.value.trim(), errorMsg);
        if (result) {
          this._clearEditMode();
          this._renderInventoryList(invList);
        }
      } else {
        const result = this._forgeCrystal(essenceInput.value.trim(), nameInput.value.trim(), errorMsg);
        if (result) {
          essenceInput.value = '';
          nameInput.value = '';
          this._updatePreview(previewText, essenceInput, previewLabel);
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
    invTitle.textContent = 'Crystal Collection';
    invTitle.style.cssText = 'font-size: 14px; color: #aa88ff; font-weight: bold;';
    invPanel.appendChild(invTitle);

    const invList = document.createElement('div');
    invList.style.cssText = `
      flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
      max-height: 320px; padding-right: 8px;
    `;
    // Add custom scrollbar styling
    invList.classList.add('crystal-inv-list');
    const style = document.createElement('style');
    style.textContent = `
      .crystal-inv-list::-webkit-scrollbar {
        width: 8px;
      }
      .crystal-inv-list::-webkit-scrollbar-track {
        background: #1a1a2e;
        border-radius: 4px;
      }
      .crystal-inv-list::-webkit-scrollbar-thumb {
        background: #6644aa;
        border-radius: 4px;
      }
      .crystal-inv-list::-webkit-scrollbar-thumb:hover {
        background: #8866cc;
      }
    `;
    overlay.appendChild(style);
    invPanel.appendChild(invList);

    content.appendChild(invPanel);

    // Store form elements for editing
    this.formElements = {
      essenceInput,
      nameInput,
      errorMsg,
      forgeBtn,
      cancelBtn,
      runeBtns,
      previewText,
      previewLabel,
      essenceContainer,
      invList,
    };
    panel.appendChild(content);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Initialize state
    this._updateRuneButtons(runeBtns);
    this._updateEssenceVisibility(essenceContainer);
    this._updatePreview(previewText, essenceInput, previewLabel);
    this._renderInventoryList(invList);

    setTimeout(() => essenceInput.focus(), 50);
  }

  _updateRuneButtons(btns) {
    for (const key of Object.keys(RUNES)) {
      const btn = btns[key];
      const rune = RUNES[key];
      const colorHex = '#' + rune.color.toString(16).padStart(6, '0');
      if (key === this.selectedRune) {
        btn.style.background = colorHex;
        btn.style.color = '#000';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = colorHex;
      }
    }
  }

  _updateEssenceVisibility(container) {
    const rune = RUNES[this.selectedRune];
    container.style.display = rune?.needsValue ? 'flex' : 'none';
  }

  _updatePreview(previewEl, essenceInput, labelEl) {
    const rune = RUNES[this.selectedRune];
    if (!rune) return;

    const raw = essenceInput.value.trim();
    const essenceStr = raw || '...';

    // Update the thematic preview text
    if (!rune.needsValue) {
      previewEl.textContent = `🔮 ${rune.preview}`;
    } else {
      previewEl.textContent = `🔮 ${rune.preview} ${essenceStr}`;
    }

    // Update the label to show the actual expression
    if (labelEl) {
      let expression;
      switch (rune.operator) {
        case '===': expression = `result === ${essenceStr}`; break;
        case '!==': expression = `result !== ${essenceStr}`; break;
        case '>': expression = `result > ${essenceStr}`; break;
        case '<': expression = `result < ${essenceStr}`; break;
        case '>=': expression = `result >= ${essenceStr}`; break;
        case '<=': expression = `result <= ${essenceStr}`; break;
        case 'truthy': expression = `!!result`; break;
        case 'falsy': expression = `!result`; break;
        case 'contains': expression = `result.includes(${essenceStr})`; break;
        default: expression = `result ${rune.operator} ${essenceStr}`;
      }
      labelEl.textContent = `Assertion (${expression})`;
    }
  }

  _updateAutoName(nameInput, essenceInput) {
    // Don't auto-update name when editing an existing crystal
    if (this.editingCrystalId) return;

    const rune = RUNES[this.selectedRune];
    if (!rune) return;

    if (!rune.needsValue) {
      nameInput.value = this.crystalInventory.generateName(this.selectedRune, null);
      return;
    }

    const raw = essenceInput.value.trim();
    if (!raw) {
      nameInput.value = '';
      return;
    }

    const parsed = this._parseEssence(raw);
    if (parsed.error) return;

    nameInput.value = this.crystalInventory.generateName(this.selectedRune, parsed.value);
  }

  _parseEssence(raw) {
    if (raw === '') return { error: 'Value is required' };

    // Try to parse as JSON first
    try {
      const value = JSON.parse(raw);
      return { value };
    } catch (e) {
      // Not valid JSON, treat as string or try other interpretations
    }

    // Check for boolean
    if (raw.toLowerCase() === 'true') return { value: true };
    if (raw.toLowerCase() === 'false') return { value: false };

    // Check for null/undefined
    if (raw.toLowerCase() === 'null') return { value: null };
    if (raw.toLowerCase() === 'undefined') return { value: undefined };

    // Check for number
    const num = Number(raw);
    if (!isNaN(num)) return { value: num };

    // Default to string
    return { value: raw };
  }

  _forgeCrystal(rawEssence, name, errorMsg) {
    errorMsg.textContent = '';
    const rune = RUNES[this.selectedRune];

    let essence = null;
    if (rune.needsValue) {
      if (!rawEssence) {
        errorMsg.textContent = 'Essence value is required';
        if (this.soundManager) this.soundManager.play('error');
        return false;
      }
      const parsed = this._parseEssence(rawEssence);
      if (parsed.error) {
        errorMsg.textContent = parsed.error;
        if (this.soundManager) this.soundManager.play('error');
        return false;
      }
      essence = parsed.value;
    }

    this.crystalInventory.add(this.selectedRune, essence, name || undefined);
    if (this.soundManager) {
      this.soundManager.play('forgeCreate');
    }
    return true;
  }

  _updateCrystal(crystalId, rawEssence, name, errorMsg) {
    errorMsg.textContent = '';
    const rune = RUNES[this.selectedRune];

    let essence = null;
    if (rune.needsValue) {
      if (!rawEssence) {
        errorMsg.textContent = 'Essence value is required';
        if (this.soundManager) this.soundManager.play('error');
        return false;
      }
      const parsed = this._parseEssence(rawEssence);
      if (parsed.error) {
        errorMsg.textContent = parsed.error;
        if (this.soundManager) this.soundManager.play('error');
        return false;
      }
      essence = parsed.value;
    }

    this.crystalInventory.update(crystalId, this.selectedRune, essence, name || undefined);
    if (this.soundManager) {
      this.soundManager.play('forgeCreate');
    }
    return true;
  }

  _editCrystal(crystal) {
    this.editingCrystalId = crystal.id;
    this.selectedRune = crystal.rune;

    // Update rune buttons
    this._updateRuneButtons(this.formElements.runeBtns);
    this._updateEssenceVisibility(this.formElements.essenceContainer);

    // Populate essence field
    const rune = RUNES[crystal.rune];
    if (rune.needsValue) {
      this.formElements.essenceInput.value = this._essenceToRaw(crystal.essence);
    } else {
      this.formElements.essenceInput.value = '';
    }
    this.formElements.nameInput.value = crystal.name;
    this.formElements.errorMsg.textContent = '';

    // Update preview
    this._updatePreview(this.formElements.previewText, this.formElements.essenceInput, this.formElements.previewLabel);

    // Update button states
    this.formElements.forgeBtn.textContent = 'UPDATE CRYSTAL';
    this.formElements.cancelBtn.style.display = 'block';

    // Focus essence input
    this.formElements.essenceInput.focus();

    // Re-render to highlight editing item
    this._renderInventoryList(this.formElements.invList);
  }

  _clearEditMode() {
    this.editingCrystalId = null;
    this.formElements.essenceInput.value = '';
    this.formElements.nameInput.value = '';
    this.formElements.errorMsg.textContent = '';
    this.formElements.forgeBtn.textContent = 'FORGE CRYSTAL';
    this.formElements.cancelBtn.style.display = 'none';
    this._updatePreview(this.formElements.previewText, this.formElements.essenceInput, this.formElements.previewLabel);
    this._renderInventoryList(this.formElements.invList);
  }

  _essenceToRaw(essence) {
    if (essence === null) return 'null';
    if (essence === undefined) return 'undefined';
    if (typeof essence === 'string') return essence;
    if (typeof essence === 'number') return String(essence);
    if (typeof essence === 'boolean') return String(essence);
    return JSON.stringify(essence, null, 2);
  }

  _renderInventoryList(listEl) {
    listEl.innerHTML = '';
    const crystals = this.crystalInventory.getAll().reverse();

    if (crystals.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No crystals yet. Forge some!';
      empty.style.cssText = 'color: #666688; font-size: 12px; text-align: center; padding: 20px 0;';
      listEl.appendChild(empty);
      return;
    }

    for (const c of crystals) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; gap: 8px; padding: 6px 8px;
        background: #0d0d1a; border-radius: 4px; border: 1px solid #333355;
      `;

      // Crystal icon
      const icon = document.createElement('span');
      icon.textContent = '🔮';
      icon.style.cssText = 'font-size: 14px; flex-shrink: 0;';
      row.appendChild(icon);

      // Color indicator
      const dot = document.createElement('span');
      dot.style.cssText = `
        display: inline-block; width: 10px; height: 10px; border-radius: 50%;
        background: #${c.color.toString(16).padStart(6, '0')};
        flex-shrink: 0;
      `;
      row.appendChild(dot);

      // Name
      const info = document.createElement('span');
      info.style.cssText = 'flex: 1; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      info.textContent = c.name;
      info.title = c.name;
      row.appendChild(info);

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.textContent = '✎';
      editBtn.title = 'Edit';
      editBtn.style.cssText = `
        background: transparent; border: 1px solid #445566; border-radius: 3px;
        color: #6688aa; font-family: monospace; font-size: 11px; cursor: pointer;
        padding: 1px 6px; flex-shrink: 0;
      `;
      editBtn.addEventListener('click', () => {
        this._editCrystal(c);
      });
      row.appendChild(editBtn);

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = 'x';
      delBtn.style.cssText = `
        background: transparent; border: 1px solid #553333; border-radius: 3px;
        color: #ff6644; font-family: monospace; font-size: 11px; cursor: pointer;
        padding: 1px 6px; flex-shrink: 0;
      `;
      delBtn.addEventListener('click', () => {
        this.crystalInventory.remove(c.id);
        if (this.editingCrystalId === c.id) {
          this._clearEditMode();
        } else {
          this._renderInventoryList(listEl);
        }
      });
      row.appendChild(delBtn);

      // Highlight if currently editing
      if (this.editingCrystalId === c.id) {
        row.style.border = '1px solid #8866cc';
        row.style.background = '#1a1a3e';
      }

      listEl.appendChild(row);
    }
  }
}
