import * as PIXI from 'pixi.js';
import { RUNES } from '../game/CrystalInventory.js';

const SLOT_W = 160;
const SLOT_H = 44; // Match weapon slot height

export default class CrystalSlot extends PIXI.Container {
  constructor(soundManager = null) {
    super();
    this.soundManager = soundManager;
    this.crystal = null;
    this.animTime = 0;
    this.slotX = 0;
    this.slotY = 0;

    // Glow effect (behind background)
    this.glow = new PIXI.Graphics();
    this.addChild(this.glow);

    // Background
    this.bg = new PIXI.Graphics();
    this._drawSlotBg(false);
    this.addChild(this.bg);

    // Label (when empty)
    this.label = new PIXI.Text('Drop Assertion Crystal', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0x8866aa,
      align: 'center',
    });
    this.label.anchor.set(0.5);
    this.label.x = SLOT_W / 2;
    this.label.y = SLOT_H / 2;
    this.addChild(this.label);

    // Crystal display elements
    this.crystalIcon = null;
    this.crystalText = null;
    this.expressionText = null;

    // Result display
    this.resultBadge = null;
  }

  setSlotPosition(weaponSlotsY, weaponSlotsEndX) {
    // Position slot on same line as weapon slots, to the right of them
    this.slotX = weaponSlotsEndX + 12; // 12px gap after weapon slots
    this.slotY = weaponSlotsY; // Same Y as weapon slots
    this.x = this.slotX;
    this.y = this.slotY;
  }

  _drawSlotBg(filled) {
    this.bg.clear();
    if (filled) {
      this.bg.beginFill(0x2a1a4e, 0.9);
      this.bg.lineStyle(2, 0xaa66ff);
    } else {
      this.bg.beginFill(0x111122, 0.85);
      this.bg.lineStyle(2, 0x8844cc, 0.9);
    }
    this.bg.drawRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
    this.bg.endFill();
  }

  _drawSlotGlow(intensity) {
    this.glow.clear();
    if (intensity <= 0) return;

    const glowColor = 0xaa66ff;
    const layers = 3;
    for (let i = layers; i >= 1; i--) {
      const expand = i * 3;
      const alpha = intensity * (0.15 / i);
      this.glow.lineStyle(expand, glowColor, alpha);
      this.glow.drawRoundedRect(-expand / 2, -expand / 2, SLOT_W + expand, SLOT_H + expand, 6 + expand / 2);
    }
  }

  update(delta) {
    this.animTime += delta * 0.05;

    // Pulsate empty slot
    if (!this.crystal) {
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.animTime * 2));
      this._drawSlotGlow(pulse);
    } else {
      this.glow.clear();
    }
  }

  dropCrystal(crystal) {
    // Clear any existing crystal display
    this._clearCrystalDisplay();
    this._clearResultDisplay();

    this.crystal = crystal;

    if (this.soundManager) {
      this.soundManager.play('weaponDrop');
    }

    // Hide placeholder label
    this.label.visible = false;

    // Draw filled background
    this._drawSlotBg(true);

    // Add crystal icon
    this.crystalIcon = new PIXI.Text('🔮', {
      fontFamily: 'sans-serif',
      fontSize: 22,
    });
    this.crystalIcon.x = 8;
    this.crystalIcon.y = (SLOT_H - 28) / 2;
    this.addChild(this.crystalIcon);

    // Add crystal name
    const rune = RUNES[crystal.rune];
    this.crystalText = new PIXI.Text(crystal.name, {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: crystal.color,
      wordWrap: true,
      wordWrapWidth: SLOT_W - 50,
    });
    this.crystalText.x = 38;
    this.crystalText.y = 6;
    this.addChild(this.crystalText);

    // Add expression text
    const expression = this._formatExpression(crystal);
    this.expressionText = new PIXI.Text(expression, {
      fontFamily: 'monospace',
      fontSize: 9,
      fill: 0xaaaacc,
    });
    this.expressionText.x = 38;
    this.expressionText.y = 28;
    this.addChild(this.expressionText);

    return true;
  }

  _formatExpression(crystal) {
    const rune = RUNES[crystal.rune];
    if (!rune) return '???';

    if (!rune.needsValue) {
      return `result is ${rune.operator}`;
    }

    const essenceStr = this._formatEssence(crystal.essence);
    return `result ${rune.operator} ${essenceStr}`;
  }

  _formatEssence(essence) {
    if (essence === null) return 'null';
    if (essence === undefined) return 'undefined';
    if (typeof essence === 'string') return `"${essence}"`;
    if (typeof essence === 'number') return String(essence);
    if (typeof essence === 'boolean') return String(essence);
    if (Array.isArray(essence)) return JSON.stringify(essence);
    if (typeof essence === 'object') return JSON.stringify(essence);
    return String(essence);
  }

  removeCrystal() {
    this._clearCrystalDisplay();
    this._clearResultDisplay();
    this.crystal = null;
    this.label.visible = true;
    this._drawSlotBg(false);
  }

  _clearCrystalDisplay() {
    if (this.crystalIcon) {
      this.removeChild(this.crystalIcon);
      this.crystalIcon.destroy();
      this.crystalIcon = null;
    }
    if (this.crystalText) {
      this.removeChild(this.crystalText);
      this.crystalText.destroy();
      this.crystalText = null;
    }
    if (this.expressionText) {
      this.removeChild(this.expressionText);
      this.expressionText.destroy();
      this.expressionText = null;
    }
  }

  _clearResultDisplay() {
    if (this.resultBadge) {
      this.removeChild(this.resultBadge);
      this.resultBadge.destroy({ children: true });
      this.resultBadge = null;
    }
  }

  showResult(passed, actual) {
    this._clearResultDisplay();

    // Create result badge
    this.resultBadge = new PIXI.Container();

    const badgeBg = new PIXI.Graphics();
    const badgeW = 60;
    const badgeH = 24;

    if (passed) {
      badgeBg.beginFill(0x226622, 0.95);
      badgeBg.lineStyle(2, 0x44ff44);
    } else {
      badgeBg.beginFill(0x662222, 0.95);
      badgeBg.lineStyle(2, 0xff4444);
    }
    badgeBg.drawRoundedRect(0, 0, badgeW, badgeH, 4);
    badgeBg.endFill();
    this.resultBadge.addChild(badgeBg);

    const badgeText = new PIXI.Text(passed ? '✓ PASS' : '✗ FAIL', {
      fontFamily: 'monospace',
      fontSize: 11,
      fontWeight: 'bold',
      fill: passed ? 0x44ff44 : 0xff4444,
    });
    badgeText.anchor.set(0.5);
    badgeText.x = badgeW / 2;
    badgeText.y = badgeH / 2;
    this.resultBadge.addChild(badgeText);

    this.resultBadge.x = SLOT_W - badgeW - 6;
    this.resultBadge.y = (SLOT_H - badgeH) / 2;
    this.addChild(this.resultBadge);

    // Update expression to show actual value if failed
    if (!passed && this.expressionText) {
      const actualStr = this._formatEssence(actual);
      this.expressionText.text = `got: ${actualStr}`;
      this.expressionText.style.fill = 0xff8888;
    }

    // Animate the slot border
    if (passed) {
      this.bg.clear();
      this.bg.beginFill(0x1a3a1a, 0.9);
      this.bg.lineStyle(3, 0x44ff44);
      this.bg.drawRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
      this.bg.endFill();
    } else {
      this.bg.clear();
      this.bg.beginFill(0x3a1a1a, 0.9);
      this.bg.lineStyle(3, 0xff4444);
      this.bg.drawRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
      this.bg.endFill();
    }
  }

  hasCrystal() {
    return this.crystal !== null;
  }

  getCrystal() {
    return this.crystal;
  }

  isOverSlot(worldX, worldY) {
    // Check if world coordinates are within this slot's bounds
    return worldX >= this.slotX && worldX <= this.slotX + SLOT_W &&
           worldY >= this.slotY && worldY <= this.slotY + SLOT_H;
  }

  reset() {
    this.removeCrystal();
  }

  getSlotBounds() {
    return { x: this.x, y: this.y, width: SLOT_W, height: SLOT_H };
  }
}
