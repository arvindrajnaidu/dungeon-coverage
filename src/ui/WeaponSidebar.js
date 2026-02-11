import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS } from '../constants.js';
import SpriteManager from '../engine/SpriteManager.js';

const SIDEBAR_W = 140;
const ITEM_H = 36;
const ITEM_PAD = 4;

export default class WeaponSidebar extends PIXI.Container {
  constructor(spriteManager, weaponInventory) {
    super();
    this.spriteManager = spriteManager;
    this.weaponInventory = weaponInventory;
    this._onDragStartCb = null;

    this.itemContainer = new PIXI.Container();
    this.addChild(this.itemContainer);

    this._layout();
  }

  _layout() {
    // Position sidebar on the right side
    this.x = VIEWPORT_WIDTH - SIDEBAR_W - 10;
    this.y = 54; // Below HUD
  }

  show() {
    this.visible = true;
    this.update();
  }

  hide() {
    this.visible = false;
  }

  update() {
    this.itemContainer.removeChildren();

    // Panel background
    const weapons = this.weaponInventory.getAll();
    const panelH = Math.max(120, weapons.length * (ITEM_H + ITEM_PAD) + 50);

    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.PANEL_BG, 0.92);
    bg.lineStyle(1, COLORS.PANEL_BORDER);
    bg.drawRoundedRect(0, 0, SIDEBAR_W, panelH, 6);
    bg.endFill();
    this.itemContainer.addChild(bg);

    // Title
    const title = new PIXI.Text('⚔ Weapons', {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xffaa44,
      fontWeight: 'bold',
    });
    title.x = 10;
    title.y = 8;
    this.itemContainer.addChild(title);

    // Drag hint
    const hint = new PIXI.Text('Drag to slots ↓', {
      fontFamily: 'monospace',
      fontSize: 9,
      fill: 0x666688,
    });
    hint.x = 10;
    hint.y = 26;
    this.itemContainer.addChild(hint);

    if (weapons.length === 0) {
      const empty = new PIXI.Text('(empty)\n\nGo to Forge\nto create\nweapons!', {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x666688,
        align: 'center',
      });
      empty.x = SIDEBAR_W / 2;
      empty.y = 60;
      empty.anchor.set(0.5, 0);
      this.itemContainer.addChild(empty);
      return;
    }

    let yOff = 44;
    for (const weapon of weapons) {
      const item = this._createWeaponItem(weapon, yOff);
      this.itemContainer.addChild(item);
      yOff += ITEM_H + ITEM_PAD;
    }

    this._layout();
  }

  _createWeaponItem(weapon, y) {
    const item = new PIXI.Container();
    item.y = y;

    // Background row
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a3e, 0.8);
    bg.lineStyle(1, weapon.color, 0.4);
    bg.drawRoundedRect(0, 0, SIDEBAR_W - 12, ITEM_H, 4);
    bg.endFill();
    item.addChild(bg);
    item.x = 6;

    // Weapon icon
    const texKey = SpriteManager.textureKeyForType(weapon.type);
    const icon = new PIXI.Sprite(this.spriteManager.getTexture(texKey));
    icon.width = 24;
    icon.height = 24;
    icon.x = 4;
    icon.y = (ITEM_H - 24) / 2;
    item.addChild(icon);

    // Weapon name
    const nameText = new PIXI.Text(weapon.name, {
      fontFamily: 'monospace',
      fontSize: 9,
      fill: weapon.color,
      wordWrap: true,
      wordWrapWidth: SIDEBAR_W - 50,
    });
    nameText.x = 32;
    nameText.y = (ITEM_H - 14) / 2;
    item.addChild(nameText);

    // Make interactive for drag
    item.eventMode = 'static';
    item.cursor = 'grab';

    item.on('pointerdown', (e) => {
      if (this._onDragStartCb) {
        this._onDragStartCb(weapon, e);
      }
    });

    return item;
  }

  onDragStart(cb) {
    this._onDragStartCb = cb;
  }
}
