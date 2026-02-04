import * as PIXI from 'pixi.js';
import { COLORS, VIEWPORT_WIDTH } from '../constants.js';
import SpriteManager from '../engine/SpriteManager.js';

const SLOT_W = 120;
const SLOT_H = 50;
const SLOT_GAP = 12;
const SLOT_Y = 8;

export default class WeaponSlots extends PIXI.Container {
  constructor(spriteManager) {
    super();
    this.spriteManager = spriteManager;
    this.slots = [];       // { paramName, type, bg, label, weapon, icon, nameText }
    this.runButton = null;
    this._onRunCb = null;
  }

  setParams(paramHints) {
    this.removeChildren();
    this.slots = [];

    const count = paramHints.length;
    const totalW = count * SLOT_W + (count - 1) * SLOT_GAP;
    const startX = (VIEWPORT_WIDTH - totalW) / 2;

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
      bg.y = SLOT_Y;
      this.addChild(bg);
      slot.bg = bg;

      // Label (param name + type hint)
      const labelText = hint.type ? `${hint.name} (${hint.type})` : hint.name;
      const label = new PIXI.Text(labelText, {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0x888899,
        align: 'center',
      });
      label.anchor.set(0.5);
      label.x = slotX + SLOT_W / 2;
      label.y = SLOT_Y + SLOT_H / 2;
      this.addChild(label);
      slot.label = label;

      this.slots.push(slot);
    }

    // Run button (hidden until all slots filled)
    this.runButton = this._createRunButton(totalW, startX, count);
    this.addChild(this.runButton);
    this._updateRunButton();
  }

  _createRunButton(totalW, startX, count) {
    const btn = new PIXI.Container();
    const btnW = 80;
    const btnH = 32;
    const bg = new PIXI.Graphics();
    bg.beginFill(0x44aa44);
    bg.drawRoundedRect(0, 0, btnW, btnH, 6);
    bg.endFill();
    btn.addChild(bg);

    const label = new PIXI.Text('RUN', {
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    label.anchor.set(0.5);
    label.x = btnW / 2;
    label.y = btnH / 2;
    btn.addChild(label);

    btn.x = (VIEWPORT_WIDTH - btnW) / 2;
    btn.y = SLOT_Y + SLOT_H + 8;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
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
      g.beginFill(0x1a2a4e);
      g.lineStyle(2, 0x7a4aaa);
    } else {
      g.beginFill(0x111133, 0.5);
      g.lineStyle(2, 0x444466, 0.6);
    }
    g.drawRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
    g.endFill();
  }

  dropWeapon(slotIdx, weapon) {
    if (slotIdx < 0 || slotIdx >= this.slots.length) return;
    const slot = this.slots[slotIdx];

    // Remove old weapon display if any
    this._clearSlotDisplay(slot);

    slot.weapon = weapon;

    // Hide placeholder label
    slot.label.visible = false;

    // Draw filled bg
    this._drawSlotBg(slot.bg, true);

    // Add weapon icon
    const texKey = SpriteManager.textureKeyForType(weapon.type);
    const icon = new PIXI.Sprite(this.spriteManager.getTexture(texKey));
    icon.width = 24;
    icon.height = 24;
    icon.x = slot.bg.x + 6;
    icon.y = SLOT_Y + (SLOT_H - 24) / 2;
    this.addChild(icon);
    slot.icon = icon;

    // Add weapon name text
    const nameText = new PIXI.Text(weapon.name, {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: weapon.color,
      wordWrap: true,
      wordWrapWidth: SLOT_W - 36,
    });
    nameText.x = slot.bg.x + 34;
    nameText.y = SLOT_Y + (SLOT_H - 14) / 2;
    this.addChild(nameText);
    slot.nameText = nameText;

    this._updateRunButton();
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

  isOverSlot(x, y) {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const sx = slot.bg.x;
      const sy = SLOT_Y;
      if (x >= sx && x <= sx + SLOT_W && y >= sy && y <= sy + SLOT_H) {
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
}
