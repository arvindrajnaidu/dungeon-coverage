import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CODE_PANEL_WIDTH, COLORS } from '../constants.js';
import SpriteManager from '../engine/SpriteManager.js';

// Dungeon area width (viewport minus code panel)
const DUNGEON_WIDTH = VIEWPORT_WIDTH - CODE_PANEL_WIDTH;

const SIDEBAR_W = 170;
const ITEM_H = 40;
const ITEM_PAD = 4;
const MAX_VISIBLE_HEIGHT = 320; // Max height for weapon list before scrolling
const HEADER_HEIGHT = 44; // Space for title and hint

export default class WeaponSidebar extends PIXI.Container {
  constructor(spriteManager, weaponInventory) {
    super();
    this.spriteManager = spriteManager;
    this.weaponInventory = weaponInventory;
    this._onDragStartCb = null;

    // Scroll state
    this.scrollY = 0;
    this.maxScroll = 0;
    this.contentHeight = 0;

    this.itemContainer = new PIXI.Container();
    this.addChild(this.itemContainer);

    // Scrollable weapon list container
    this.weaponListContainer = new PIXI.Container();

    // Scrollbar
    this.scrollbar = new PIXI.Graphics();

    // Bind scroll handler
    this._onWheel = this._onWheel.bind(this);

    this._layout();
  }

  _layout() {
    // Position sidebar on the right side of dungeon area
    this.x = DUNGEON_WIDTH - SIDEBAR_W - 10;
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
    this.weaponListContainer.removeChildren();
    this.scrollY = 0;

    // Reverse order so newest weapons appear at the top
    const weapons = this.weaponInventory.getAll().reverse();
    this.contentHeight = weapons.length * (ITEM_H + ITEM_PAD);
    const listHeight = Math.min(this.contentHeight, MAX_VISIBLE_HEIGHT);
    const panelH = Math.max(120, listHeight + HEADER_HEIGHT + 10);
    const needsScroll = this.contentHeight > MAX_VISIBLE_HEIGHT;

    this.maxScroll = Math.max(0, this.contentHeight - MAX_VISIBLE_HEIGHT);

    // Panel background
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.PANEL_BG, 0.92);
    bg.lineStyle(1, COLORS.PANEL_BORDER);
    bg.drawRoundedRect(0, 0, SIDEBAR_W, panelH, 6);
    bg.endFill();
    this.itemContainer.addChild(bg);

    // Title (centered)
    const title = new PIXI.Text('⚔ Weapons', {
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0xffaa44,
      fontWeight: 'bold',
    });
    title.anchor.set(0.5, 0);
    title.x = SIDEBAR_W / 2;
    title.y = 8;
    this.itemContainer.addChild(title);

    // Drag hint (centered)
    const hint = new PIXI.Text('Drag to slots ↓', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0x666688,
    });
    hint.anchor.set(0.5, 0);
    hint.x = SIDEBAR_W / 2;
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
      this._disableScroll();
      return;
    }

    // Create weapon items in the scrollable container
    let yOff = 0;
    for (const weapon of weapons) {
      const item = this._createWeaponItem(weapon, yOff);
      this.weaponListContainer.addChild(item);
      yOff += ITEM_H + ITEM_PAD;
    }

    // Position the weapon list container
    this.weaponListContainer.y = HEADER_HEIGHT;
    this.itemContainer.addChild(this.weaponListContainer);

    // Create mask for scrolling
    if (needsScroll) {
      const mask = new PIXI.Graphics();
      mask.beginFill(0xffffff);
      mask.drawRect(0, HEADER_HEIGHT, SIDEBAR_W, MAX_VISIBLE_HEIGHT);
      mask.endFill();
      this.itemContainer.addChild(mask);
      this.weaponListContainer.mask = mask;

      // Add scrollbar
      this._drawScrollbar(listHeight);
      this.itemContainer.addChild(this.scrollbar);

      this._enableScroll();
    } else {
      this.weaponListContainer.mask = null;
      this._disableScroll();
    }

    this._layout();
  }

  _drawScrollbar(listHeight) {
    this.scrollbar.clear();

    if (this.maxScroll <= 0) return;

    const trackHeight = MAX_VISIBLE_HEIGHT - 8;
    const thumbHeight = Math.max(30, (MAX_VISIBLE_HEIGHT / this.contentHeight) * trackHeight);
    const thumbY = (this.scrollY / this.maxScroll) * (trackHeight - thumbHeight);

    // Track
    this.scrollbar.beginFill(0x1a1a2e, 0.8);
    this.scrollbar.drawRoundedRect(SIDEBAR_W - 10, HEADER_HEIGHT + 4, 6, trackHeight, 3);
    this.scrollbar.endFill();

    // Thumb
    this.scrollbar.beginFill(0x533483, 1);
    this.scrollbar.drawRoundedRect(SIDEBAR_W - 10, HEADER_HEIGHT + 4 + thumbY, 6, thumbHeight, 3);
    this.scrollbar.endFill();
  }

  _enableScroll() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('wheel', this._onWheel);
      canvas.addEventListener('wheel', this._onWheel, { passive: false });
    }
  }

  _disableScroll() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('wheel', this._onWheel);
    }
  }

  _onWheel(e) {
    if (!this.visible || this.maxScroll <= 0) return;

    // Check if mouse is over the sidebar
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Get sidebar bounds in screen coordinates
    const sidebarX = this.x + CODE_PANEL_WIDTH;
    const sidebarY = this.y;

    if (mouseX >= sidebarX && mouseX <= sidebarX + SIDEBAR_W &&
        mouseY >= sidebarY && mouseY <= sidebarY + MAX_VISIBLE_HEIGHT + HEADER_HEIGHT) {
      e.preventDefault();
      this.scrollY = Math.min(this.maxScroll, Math.max(0, this.scrollY + e.deltaY * 0.5));
      this.weaponListContainer.y = HEADER_HEIGHT - this.scrollY;
      this._drawScrollbar(MAX_VISIBLE_HEIGHT);
    }
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
    icon.width = 28;
    icon.height = 28;
    icon.x = 6;
    icon.y = (ITEM_H - 28) / 2;
    item.addChild(icon);

    // Weapon name
    const nameText = new PIXI.Text(weapon.name, {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: weapon.color,
      wordWrap: true,
      wordWrapWidth: SIDEBAR_W - 50,
    });
    nameText.x = 34;
    nameText.y = (ITEM_H - 16) / 2;
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

  destroy(options) {
    this._disableScroll();
    super.destroy(options);
  }
}
