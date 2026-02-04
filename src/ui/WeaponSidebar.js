import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS } from '../constants.js';
import SpriteManager from '../engine/SpriteManager.js';

const SIDEBAR_W = 130;
const TAB_W = 28;
const ITEM_H = 36;
const ITEM_PAD = 4;

export default class WeaponSidebar extends PIXI.Container {
  constructor(spriteManager, weaponInventory) {
    super();
    this.spriteManager = spriteManager;
    this.weaponInventory = weaponInventory;
    this.expanded = true;
    this._onDragStartCb = null;

    this.panelContainer = new PIXI.Container();
    this.addChild(this.panelContainer);

    // Toggle tab
    this.tab = this._createTab();
    this.addChild(this.tab);

    this.itemContainer = new PIXI.Container();
    this.panelContainer.addChild(this.itemContainer);

    this._layout();
  }

  _createTab() {
    const tab = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.PANEL_BG);
    bg.lineStyle(1, COLORS.PANEL_BORDER);
    bg.drawRoundedRect(0, 0, TAB_W, 60, 4);
    bg.endFill();
    tab.addChild(bg);

    const label = new PIXI.Text('\u2694', {
      fontFamily: 'monospace',
      fontSize: 18,
      fill: 0xffaa44,
    });
    label.anchor.set(0.5);
    label.x = TAB_W / 2;
    label.y = 30;
    tab.addChild(label);

    tab.eventMode = 'static';
    tab.cursor = 'pointer';
    tab.on('pointertap', () => this.toggle());
    return tab;
  }

  _layout() {
    const panelX = this.expanded ? VIEWPORT_WIDTH - SIDEBAR_W : VIEWPORT_WIDTH;
    this.panelContainer.x = panelX;
    this.panelContainer.y = 70; // below weapon slots area
    this.tab.x = panelX - TAB_W;
    this.tab.y = 70;
  }

  toggle() {
    this.expanded = !this.expanded;
    this._layout();
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
    const panelH = Math.max(100, weapons.length * (ITEM_H + ITEM_PAD) + 40);

    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.PANEL_BG, 0.92);
    bg.lineStyle(1, COLORS.PANEL_BORDER);
    bg.drawRoundedRect(0, 0, SIDEBAR_W, panelH, 6);
    bg.endFill();
    this.itemContainer.addChild(bg);

    // Title
    const title = new PIXI.Text('Weapons', {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0xffaa44,
      fontWeight: 'bold',
    });
    title.x = 8;
    title.y = 6;
    this.itemContainer.addChild(title);

    if (weapons.length === 0) {
      const empty = new PIXI.Text('(empty)\nForge some\nweapons!', {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x666688,
        align: 'center',
      });
      empty.x = SIDEBAR_W / 2;
      empty.y = 50;
      empty.anchor.set(0.5, 0);
      this.itemContainer.addChild(empty);
      return;
    }

    let yOff = 24;
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
    bg.drawRoundedRect(0, 0, SIDEBAR_W - 8, ITEM_H, 4);
    bg.endFill();
    item.addChild(bg);
    item.x = 4;

    // Weapon icon
    const texKey = SpriteManager.textureKeyForType(weapon.type);
    const icon = new PIXI.Sprite(this.spriteManager.getTexture(texKey));
    icon.width = 22;
    icon.height = 22;
    icon.x = 4;
    icon.y = (ITEM_H - 22) / 2;
    item.addChild(icon);

    // Weapon name
    const nameText = new PIXI.Text(weapon.name, {
      fontFamily: 'monospace',
      fontSize: 9,
      fill: weapon.color,
      wordWrap: true,
      wordWrapWidth: SIDEBAR_W - 42,
    });
    nameText.x = 30;
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
