import * as PIXI from 'pixi.js';
import { COLORS, VIEWPORT_WIDTH, TILE_SIZE } from '../constants.js';
import SpriteManager from '../engine/SpriteManager.js';

const SLOT_W = 140;
const SLOT_H = 44;
const SLOT_GAP = 8;

// Abbreviate type names to save space
function abbreviateType(type) {
  const abbrevs = {
    'function': 'fn',
    'number': 'num',
    'string': 'str',
    'boolean': 'bool',
    'array': 'arr',
    'object': 'obj',
  };
  return abbrevs[type?.toLowerCase()] || type;
}

export default class WeaponSlots extends PIXI.Container {
  constructor(spriteManager, soundManager = null) {
    super();
    this.spriteManager = spriteManager;
    this.soundManager = soundManager;
    this.slots = [];       // { paramName, type, bg, label, weapon, icon, nameText }
    this.runButton = null;
    this._onRunCb = null;
    this.slotOffsetY = 0;  // Y offset for slots relative to container
  }

  setParams(paramHints, entryX, entryY) {
    this.removeChildren();
    this.slots = [];

    const count = paramHints.length;
    const totalW = count * SLOT_W + (count - 1) * SLOT_GAP;

    // Position slots centered above the entry point
    const entryPixelX = entryX * TILE_SIZE + TILE_SIZE / 2;
    const entryPixelY = entryY * TILE_SIZE;

    // Center the slots horizontally above entry
    const startX = entryPixelX - totalW / 2;

    // Position above entry point with some padding
    this.slotOffsetY = entryPixelY - SLOT_H - 60; // 60px above entry

    for (let i = 0; i < count; i++) {
      const hint = paramHints[i];
      const slotX = startX + i * (SLOT_W + SLOT_GAP);

      const slot = {
        paramName: hint.name,
        type: hint.type || '',
        weapon: null,
        icon: null,
        nameText: null,
      };

      // Background
      const bg = new PIXI.Graphics();
      this._drawSlotBg(bg, false);
      bg.x = slotX;
      bg.y = this.slotOffsetY;
      this.addChild(bg);
      slot.bg = bg;

      // Label (param name + abbreviated type hint)
      const typeAbbrev = abbreviateType(hint.type);
      const labelText = typeAbbrev ? `${hint.name} (${typeAbbrev})` : hint.name;
      const label = new PIXI.Text(labelText, {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x888899,
        align: 'center',
      });
      label.anchor.set(0.5);
      label.x = slotX + SLOT_W / 2;
      label.y = this.slotOffsetY + SLOT_H / 2;
      this.addChild(label);
      slot.label = label;

      this.slots.push(slot);
    }

    // Run button (hidden until all slots filled)
    this.runButton = this._createRunButton(entryPixelX);
    this.addChild(this.runButton);
    this._updateRunButton();
  }

  _createRunButton(centerX) {
    const btn = new PIXI.Container();
    const btnW = 70;
    const btnH = 28;
    const bg = new PIXI.Graphics();
    bg.beginFill(0x44aa44);
    bg.lineStyle(2, 0x66cc66);
    bg.drawRoundedRect(0, 0, btnW, btnH, 6);
    bg.endFill();
    btn.addChild(bg);

    const label = new PIXI.Text('RUN', {
      fontFamily: 'monospace',
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    label.anchor.set(0.5);
    label.x = btnW / 2;
    label.y = btnH / 2;
    btn.addChild(label);

    btn.x = centerX - btnW / 2;
    btn.y = this.slotOffsetY + SLOT_H + 6;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    // Hover effect
    btn.on('pointerover', () => {
      bg.clear();
      bg.beginFill(0x55bb55);
      bg.lineStyle(2, 0x77dd77);
      bg.drawRoundedRect(0, 0, btnW, btnH, 6);
      bg.endFill();
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.beginFill(0x44aa44);
      bg.lineStyle(2, 0x66cc66);
      bg.drawRoundedRect(0, 0, btnW, btnH, 6);
      bg.endFill();
    });

    btn.on('pointertap', () => {
      if (this.allFilled() && this._onRunCb) {
        this._onRunCb();
      }
    });

    return btn;
  }

  _drawSlotBg(g, filled) {
    g.clear();
    if (filled) {
      g.beginFill(0x1a2a4e, 0.9);
      g.lineStyle(2, 0x7a4aaa);
    } else {
      g.beginFill(0x111133, 0.7);
      g.lineStyle(2, 0x444466, 0.8);
    }
    g.drawRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
    g.endFill();
  }

  dropWeapon(slotIdx, weapon) {
    if (slotIdx < 0 || slotIdx >= this.slots.length) return false;
    const slot = this.slots[slotIdx];

    // Validate type compatibility
    if (!this._isTypeCompatible(slot.type, weapon.type)) {
      // Play error sound
      if (this.soundManager) {
        this.soundManager.play('error');
      }
      // Show error message
      this._showTypeError(slot, weapon.type);
      return false;
    }

    // Remove old weapon display if any
    this._clearSlotDisplay(slot);

    slot.weapon = weapon;

    // Play weapon drop sound
    if (this.soundManager) {
      this.soundManager.play('weaponDrop');
    }

    // Hide placeholder label
    slot.label.visible = false;

    // Draw filled bg
    this._drawSlotBg(slot.bg, true);

    // Add weapon icon
    const texKey = SpriteManager.textureKeyForType(weapon.type);
    const icon = new PIXI.Sprite(this.spriteManager.getTexture(texKey));
    icon.width = 22;
    icon.height = 22;
    icon.x = slot.bg.x + 6;
    icon.y = this.slotOffsetY + (SLOT_H - 22) / 2;
    this.addChild(icon);
    slot.icon = icon;

    // Add weapon name text
    const nameText = new PIXI.Text(weapon.name, {
      fontFamily: 'monospace',
      fontSize: 9,
      fill: weapon.color,
      wordWrap: true,
      wordWrapWidth: SLOT_W - 34,
    });
    nameText.x = slot.bg.x + 32;
    nameText.y = this.slotOffsetY + (SLOT_H - 12) / 2;
    this.addChild(nameText);
    slot.nameText = nameText;

    this._updateRunButton();
    return true;
  }

  removeWeapon(slotIdx) {
    if (slotIdx < 0 || slotIdx >= this.slots.length) return;
    const slot = this.slots[slotIdx];
    this._clearSlotDisplay(slot);
    slot.weapon = null;
    slot.label.visible = true;
    this._drawSlotBg(slot.bg, false);
    this._updateRunButton();
  }

  _clearSlotDisplay(slot) {
    if (slot.icon) {
      this.removeChild(slot.icon);
      slot.icon.destroy();
      slot.icon = null;
    }
    if (slot.nameText) {
      this.removeChild(slot.nameText);
      slot.nameText.destroy();
      slot.nameText = null;
    }
  }

  getValues() {
    const values = {};
    for (const slot of this.slots) {
      if (slot.weapon) {
        values[slot.paramName] = slot.weapon.value;
      }
    }
    return values;
  }

  allFilled() {
    return this.slots.length > 0 && this.slots.every(s => s.weapon !== null);
  }

  isOverSlot(globalX, globalY) {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const sx = slot.bg.x;
      const sy = this.slotOffsetY;
      if (globalX >= sx && globalX <= sx + SLOT_W && globalY >= sy && globalY <= sy + SLOT_H) {
        return i;
      }
    }
    return -1;
  }

  onRun(cb) {
    this._onRunCb = cb;
  }

  reset() {
    for (let i = 0; i < this.slots.length; i++) {
      this.removeWeapon(i);
    }
  }

  _updateRunButton() {
    if (this.runButton) {
      this.runButton.visible = this.allFilled();
    }
  }

  _isTypeCompatible(expectedType, weaponType) {
    // If no type specified, accept anything
    if (!expectedType || expectedType === '') return true;

    // Direct match
    if (expectedType === weaponType) return true;

    // Function type accepts stubs
    if (expectedType === 'function' && weaponType === 'stub') return true;

    // Object type accepts json
    if (expectedType === 'object' && weaponType === 'json') return true;

    // Any type accepts anything
    if (expectedType === 'any') return true;

    return false;
  }

  _showTypeError(slot, weaponType) {
    // Create error message with abbreviated types
    const expectedType = abbreviateType(slot.type) || 'any';
    const gotType = abbreviateType(weaponType);
    const errorText = new PIXI.Text(`Need ${expectedType}, got ${gotType}`, {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xff4444,
      align: 'center',
    });
    errorText.anchor.set(0.5);
    errorText.x = slot.bg.x + SLOT_W / 2;
    errorText.y = this.slotOffsetY - 12;
    this.addChild(errorText);

    // Flash the slot red
    const originalBg = slot.bg;
    this._drawSlotError(originalBg);

    // Remove error message and restore slot after delay
    setTimeout(() => {
      if (errorText.parent) {
        this.removeChild(errorText);
        errorText.destroy();
      }
      this._drawSlotBg(originalBg, slot.weapon !== null);
    }, 1500);
  }

  _drawSlotError(g) {
    g.clear();
    g.beginFill(0x331111, 0.9);
    g.lineStyle(2, 0xff4444);
    g.drawRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
    g.endFill();
  }
}
