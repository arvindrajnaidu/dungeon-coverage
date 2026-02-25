import * as PIXI from 'pixi.js';
import { VIEWPORT_HEIGHT, INVENTORY_PANEL_WIDTH } from '../constants.js';
import SpriteManager from '../engine/SpriteManager.js';

const ITEM_H = 38;
const ITEM_PAD = 3;
const SECTION_HEADER_H = 32;

export default class InventoryPanel extends PIXI.Container {
  constructor(spriteManager, weaponInventory, crystalInventory, width, height) {
    super();
    this.spriteManager = spriteManager;
    this.weaponInventory = weaponInventory;
    this.crystalInventory = crystalInventory;
    this.panelWidth = width || INVENTORY_this.panelWidthIDTH;
    this.panelHeight = height || VIEWPORT_HEIGHT;

    this._onWeaponDragCb = null;
    this._onCrystalDragCb = null;

    // Scroll state for each section
    this.weaponScrollY = 0;
    this.weaponMaxScroll = 0;
    this.crystalScrollY = 0;
    this.crystalMaxScroll = 0;

    // Calculate section heights (full height for weapons only if no crystals, else split)
    this.hascrystals = crystalInventory !== null;
    this.sectionHeight = this.hascrystals ? Math.floor(this.panelHeight / 2) : this.panelHeight;

    // Containers
    this.panelBg = new PIXI.Graphics();
    this.addChild(this.panelBg);

    this.weaponSection = new PIXI.Container();
    this.addChild(this.weaponSection);

    if (this.hascrystals) {
      this.crystalSection = new PIXI.Container();
      this.addChild(this.crystalSection);
    }

    // Bind scroll handler
    this._onWheel = this._onWheel.bind(this);

    this._drawBackground();
  }

  _drawBackground() {
    this.panelBg.clear();
    this.panelBg.beginFill(0x0d0d1a);
    this.panelBg.drawRect(0, 0, this.panelWidth, this.panelHeight);
    this.panelBg.endFill();

    // Divider line between sections (only if crystals enabled)
    if (this.hascrystals) {
      this.panelBg.lineStyle(1, 0x333355);
      this.panelBg.moveTo(0, this.sectionHeight);
      this.panelBg.lineTo(this.panelWidth, this.sectionHeight);
    }
  }

  show() {
    this.visible = true;
    this.update();
    this._enableScroll();
  }

  hide() {
    this.visible = false;
    this._disableScroll();
  }

  update() {
    this._renderWeapons();
    if (this.hascrystals) {
      this._renderCrystals();
    }
  }

  _renderWeapons() {
    this.weaponSection.removeChildren();
    this.weaponScrollY = 0;

    const weapons = this.weaponInventory.getAll().reverse();
    const listHeight = this.sectionHeight - SECTION_HEADER_H;
    const contentHeight = weapons.length * (ITEM_H + ITEM_PAD);
    this.weaponMaxScroll = Math.max(0, contentHeight - listHeight);

    // Section header
    const header = new PIXI.Container();
    const headerBg = new PIXI.Graphics();
    headerBg.beginFill(0x1a1a2e, 0.9);
    headerBg.drawRect(0, 0, this.panelWidth, SECTION_HEADER_H);
    headerBg.endFill();
    header.addChild(headerBg);

    const title = new PIXI.Text('Weapons', {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xffaa44,
      fontWeight: 'bold',
    });
    title.x = 10;
    title.y = 8;
    header.addChild(title);

    this.weaponSection.addChild(header);

    // List container
    const listContainer = new PIXI.Container();
    listContainer.y = SECTION_HEADER_H;

    if (weapons.length === 0) {
      const empty = new PIXI.Text('No weapons\n\nUse Forge to\ncreate some!', {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x555577,
        align: 'center',
      });
      empty.anchor.set(0.5, 0);
      empty.x = this.panelWidth / 2;
      empty.y = 20;
      listContainer.addChild(empty);
    } else {
      // Scrollable content
      this.weaponListContent = new PIXI.Container();
      let yOff = 0;
      for (const weapon of weapons) {
        const item = this._createWeaponItem(weapon, yOff);
        this.weaponListContent.addChild(item);
        yOff += ITEM_H + ITEM_PAD;
      }
      listContainer.addChild(this.weaponListContent);

      // Mask for scrolling
      if (this.weaponMaxScroll > 0) {
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(0, SECTION_HEADER_H, this.panelWidth, listHeight);
        mask.endFill();
        this.weaponSection.addChild(mask);
        this.weaponListContent.mask = mask;

        // Scrollbar
        this.weaponScrollbar = new PIXI.Graphics();
        this._drawScrollbar(this.weaponScrollbar, SECTION_HEADER_H, listHeight,
          this.weaponScrollY, this.weaponMaxScroll, contentHeight, 0x533483);
        this.weaponSection.addChild(this.weaponScrollbar);
      }
    }

    this.weaponSection.addChild(listContainer);
  }

  _renderCrystals() {
    if (!this.hascrystals || !this.crystalSection) return;

    this.crystalSection.removeChildren();
    this.crystalSection.y = this.sectionHeight;
    this.crystalScrollY = 0;

    const crystals = this.crystalInventory.getAll().reverse();
    const listHeight = this.sectionHeight - SECTION_HEADER_H;
    const contentHeight = crystals.length * (ITEM_H + ITEM_PAD);
    this.crystalMaxScroll = Math.max(0, contentHeight - listHeight);

    // Section header
    const header = new PIXI.Container();
    const headerBg = new PIXI.Graphics();
    headerBg.beginFill(0x1a1a2e, 0.9);
    headerBg.drawRect(0, 0, this.panelWidth, SECTION_HEADER_H);
    headerBg.endFill();
    header.addChild(headerBg);

    const title = new PIXI.Text('Crystals', {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xaa88ff,
      fontWeight: 'bold',
    });
    title.x = 10;
    title.y = 8;
    header.addChild(title);

    this.crystalSection.addChild(header);

    // List container
    const listContainer = new PIXI.Container();
    listContainer.y = SECTION_HEADER_H;

    if (crystals.length === 0) {
      const empty = new PIXI.Text('No crystals\n\nUse Forge to\ncreate some!', {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x555577,
        align: 'center',
      });
      empty.anchor.set(0.5, 0);
      empty.x = this.panelWidth / 2;
      empty.y = 20;
      listContainer.addChild(empty);
    } else {
      // Scrollable content
      this.crystalListContent = new PIXI.Container();
      let yOff = 0;
      for (const crystal of crystals) {
        const item = this._createCrystalItem(crystal, yOff);
        this.crystalListContent.addChild(item);
        yOff += ITEM_H + ITEM_PAD;
      }
      listContainer.addChild(this.crystalListContent);

      // Mask for scrolling
      if (this.crystalMaxScroll > 0) {
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(0, SECTION_HEADER_H, this.panelWidth, listHeight);
        mask.endFill();
        this.crystalSection.addChild(mask);
        this.crystalListContent.mask = mask;

        // Scrollbar
        this.crystalScrollbar = new PIXI.Graphics();
        this._drawScrollbar(this.crystalScrollbar, SECTION_HEADER_H, listHeight,
          this.crystalScrollY, this.crystalMaxScroll, contentHeight, 0x6644aa);
        this.crystalSection.addChild(this.crystalScrollbar);
      }
    }

    this.crystalSection.addChild(listContainer);
  }

  _drawScrollbar(graphics, startY, trackHeight, scrollY, maxScroll, contentHeight, color) {
    graphics.clear();
    if (maxScroll <= 0) return;

    const thumbHeight = Math.max(20, (trackHeight / contentHeight) * trackHeight);
    const thumbY = (scrollY / maxScroll) * (trackHeight - thumbHeight);

    // Track
    graphics.beginFill(0x1a1a2e, 0.8);
    graphics.drawRoundedRect(this.panelWidth - 8, startY + 2, 5, trackHeight - 4, 2);
    graphics.endFill();

    // Thumb
    graphics.beginFill(color, 0.8);
    graphics.drawRoundedRect(this.panelWidth - 8, startY + 2 + thumbY, 5, thumbHeight, 2);
    graphics.endFill();
  }

  _createWeaponItem(weapon, y) {
    const item = new PIXI.Container();
    item.y = y;
    item.x = 4;

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a3e, 0.7);
    bg.lineStyle(1, weapon.color, 0.3);
    bg.drawRoundedRect(0, 0, this.panelWidth - 16, ITEM_H, 4);
    bg.endFill();
    item.addChild(bg);

    // Icon
    const texKey = SpriteManager.textureKeyForType(weapon.type);
    const icon = new PIXI.Sprite(this.spriteManager.getTexture(texKey));
    icon.width = 24;
    icon.height = 24;
    icon.x = 6;
    icon.y = (ITEM_H - 24) / 2;
    item.addChild(icon);

    // Name
    const name = new PIXI.Text(weapon.name, {
      fontFamily: 'monospace',
      fontSize: 11,
      fill: weapon.color,
      wordWrap: true,
      wordWrapWidth: this.panelWidth - 50,
    });
    name.x = 34;
    name.y = (ITEM_H - 14) / 2;
    item.addChild(name);

    // Interactive
    item.eventMode = 'static';
    item.cursor = 'grab';
    item.on('pointerdown', (e) => {
      if (this._onWeaponDragCb) this._onWeaponDragCb(weapon, e);
    });

    return item;
  }

  _createCrystalItem(crystal, y) {
    const item = new PIXI.Container();
    item.y = y;
    item.x = 4;

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a3e, 0.7);
    bg.lineStyle(1, crystal.color, 0.3);
    bg.drawRoundedRect(0, 0, this.panelWidth - 16, ITEM_H, 4);
    bg.endFill();
    item.addChild(bg);

    // Crystal emoji
    const icon = new PIXI.Text('🔮', {
      fontFamily: 'sans-serif',
      fontSize: 18,
    });
    icon.x = 8;
    icon.y = (ITEM_H - 22) / 2;
    item.addChild(icon);

    // Color dot
    const dot = new PIXI.Graphics();
    dot.beginFill(crystal.color);
    dot.drawCircle(0, 0, 4);
    dot.endFill();
    dot.x = 38;
    dot.y = ITEM_H / 2;
    item.addChild(dot);

    // Name
    const name = new PIXI.Text(crystal.name, {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xccccee,
      wordWrap: true,
      wordWrapWidth: this.panelWidth - 60,
    });
    name.x = 48;
    name.y = (ITEM_H - 12) / 2;
    item.addChild(name);

    // Interactive
    item.eventMode = 'static';
    item.cursor = 'grab';
    item.on('pointerdown', (e) => {
      if (this._onCrystalDragCb) this._onCrystalDragCb(crystal, e);
    });

    return item;
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
    if (!this.visible) return;

    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Panel is positioned absolutely in the main container
    const panelGlobalX = this.x;
    const panelGlobalY = this.y;

    if (mouseX < panelGlobalX || mouseX > panelGlobalX + this.panelWidth) return;
    if (mouseY < panelGlobalY || mouseY > panelGlobalY + this.panelHeight) return;

    // Determine which section
    const relativeY = mouseY - panelGlobalY;
    const listHeight = this.sectionHeight - SECTION_HEADER_H;

    if (this.weaponMaxScroll > 0 && (!this.hascrystals || relativeY < this.sectionHeight)) {
      // Scrolling weapons
      e.preventDefault();
      this.weaponScrollY = Math.min(this.weaponMaxScroll, Math.max(0, this.weaponScrollY + e.deltaY * 0.5));
      if (this.weaponListContent) {
        this.weaponListContent.y = -this.weaponScrollY;
      }
      if (this.weaponScrollbar) {
        const contentHeight = (this.weaponMaxScroll + listHeight);
        this._drawScrollbar(this.weaponScrollbar, SECTION_HEADER_H, listHeight,
          this.weaponScrollY, this.weaponMaxScroll, contentHeight, 0x533483);
      }
    } else if (this.hascrystals && relativeY >= this.sectionHeight && this.crystalMaxScroll > 0) {
      // Scrolling crystals
      e.preventDefault();
      this.crystalScrollY = Math.min(this.crystalMaxScroll, Math.max(0, this.crystalScrollY + e.deltaY * 0.5));
      if (this.crystalListContent) {
        this.crystalListContent.y = -this.crystalScrollY;
      }
      if (this.crystalScrollbar) {
        const contentHeight = (this.crystalMaxScroll + listHeight);
        this._drawScrollbar(this.crystalScrollbar, SECTION_HEADER_H, listHeight,
          this.crystalScrollY, this.crystalMaxScroll, contentHeight, 0x6644aa);
      }
    }
  }

  onWeaponDrag(cb) {
    this._onWeaponDragCb = cb;
  }

  onCrystalDrag(cb) {
    this._onCrystalDragCb = cb;
  }

  destroy(options) {
    this._disableScroll();
    super.destroy(options);
  }
}
