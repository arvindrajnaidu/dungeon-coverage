import * as PIXI from 'pixi.js';
import { TILE_SIZE, COLORS } from '../constants.js';
import WeaponInventory from '../game/WeaponInventory.js';

export default class SpriteManager {
  constructor() {
    this.textures = {};
    this.loaded = false;
    this._renderer = null;
  }

  async load(renderer) {
    this._renderer = renderer;
    this._generateTextures();
    this.loaded = true;
  }

  _generateTextures() {
    this.textures.floor = this._makeTileTexture(COLORS.FLOOR, false);
    this.textures.wall = this._makeTileTexture(COLORS.WALL, true);
    this.textures.corridor = this._makeTileTexture(COLORS.CORRIDOR, false);
    this.textures.branch = this._makeBranchTexture();
    this.textures.exit = this._makeExitTexture();
    this.textures.entry = this._makeEntryTexture();
    this.textures.merge = this._makeMergeTexture();
    this.textures.doorLeft = this._makeDoorTexture('left');
    this.textures.doorRight = this._makeDoorTexture('right');
    this.textures.loopBack = this._makeLoopBackTexture();
    this.textures.catchEntry = this._makeCatchEntryTexture();

    this.textures.playerDown = this._makePlayerTexture(0);
    this.textures.playerUp = this._makePlayerTexture(1);
    this.textures.playerLeft = this._makePlayerTexture(2);
    this.textures.playerRight = this._makePlayerTexture(3);
    this.textures.playerIdle = this._makePlayerTexture(0);

    this.textures.gem = this._makeGemTexture(COLORS.GEM_UNCOLLECTED, 1.0);
    this.textures.gemCollected = this._makeGemTexture(COLORS.GEM_COLLECTED, 1.0);
    this.textures.gemGhost = this._makeGemTexture(COLORS.GEM_GHOST, 0.4);

    // Weapon / rune textures
    this.textures.weaponNumber = this._makeWeaponTexture(COLORS.WEAPON_NUMBER);
    this.textures.weaponString = this._makeWeaponTexture(COLORS.WEAPON_STRING);
    this.textures.weaponBoolean = this._makeWeaponTexture(COLORS.WEAPON_BOOLEAN);
    this.textures.weaponArray = this._makeWeaponTexture(COLORS.WEAPON_ARRAY);
  }

  _makeTileTexture(color, isWall) {
    const g = new PIXI.Graphics();
    g.beginFill(color);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();

    if (isWall) {
      g.lineStyle(1, 0x222244, 0.5);
      g.drawRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
      g.lineStyle(1, 0x111133, 0.3);
      g.moveTo(0, TILE_SIZE / 2);
      g.lineTo(TILE_SIZE, TILE_SIZE / 2);
      g.moveTo(TILE_SIZE / 2, 0);
      g.lineTo(TILE_SIZE / 2, TILE_SIZE / 2);
    } else {
      g.beginFill(0xffffff, 0.03);
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(Math.random() * (TILE_SIZE - 2)) + 1;
        const y = Math.floor(Math.random() * (TILE_SIZE - 2)) + 1;
        g.drawRect(x, y, 1, 1);
      }
      g.endFill();
    }
    return this._graphicsToTexture(g);
  }

  _makeBranchTexture() {
    const g = new PIXI.Graphics();
    g.beginFill(COLORS.BRANCH_TILE);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();
    g.beginFill(0xffaa44);
    const cx = TILE_SIZE / 2, cy = TILE_SIZE / 2, s = 6;
    g.moveTo(cx, cy - s);
    g.lineTo(cx + s, cy);
    g.lineTo(cx, cy + s);
    g.lineTo(cx - s, cy);
    g.closePath();
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeMergeTexture() {
    const g = new PIXI.Graphics();
    g.beginFill(COLORS.CORRIDOR);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();
    g.beginFill(0xaaaacc);
    const cx = TILE_SIZE / 2;
    g.moveTo(cx - 4, TILE_SIZE / 2 - 4);
    g.lineTo(cx + 4, TILE_SIZE / 2 - 4);
    g.lineTo(cx, TILE_SIZE / 2 + 4);
    g.closePath();
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeExitTexture() {
    const g = new PIXI.Graphics();
    g.beginFill(COLORS.EXIT_TILE);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();
    g.beginFill(0x2a6a2a);
    g.drawRoundedRect(6, 2, TILE_SIZE - 12, TILE_SIZE - 4, 4);
    g.endFill();
    g.beginFill(0xffdd44);
    g.drawCircle(TILE_SIZE - 10, TILE_SIZE / 2, 2);
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeEntryTexture() {
    const g = new PIXI.Graphics();
    g.beginFill(COLORS.ENTRY_TILE);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();
    g.beginFill(0xdddd44);
    const cx = TILE_SIZE / 2;
    g.moveTo(cx - 5, 8);
    g.lineTo(cx + 5, 8);
    g.lineTo(cx, 18);
    g.closePath();
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeDoorTexture(side) {
    const g = new PIXI.Graphics();
    g.beginFill(COLORS.CORRIDOR);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();
    g.beginFill(0xaaaacc, 0.6);
    const cy = TILE_SIZE / 2;
    if (side === 'left') {
      g.moveTo(TILE_SIZE - 6, cy - 4);
      g.lineTo(6, cy);
      g.lineTo(TILE_SIZE - 6, cy + 4);
    } else {
      g.moveTo(6, cy - 4);
      g.lineTo(TILE_SIZE - 6, cy);
      g.lineTo(6, cy + 4);
    }
    g.closePath();
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeLoopBackTexture() {
    const g = new PIXI.Graphics();
    g.beginFill(COLORS.CORRIDOR);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();
    g.lineStyle(2, 0xaaddaa, 0.8);
    g.arc(TILE_SIZE / 2, TILE_SIZE / 2, 8, 0, Math.PI * 1.5);
    g.beginFill(0xaaddaa);
    g.moveTo(TILE_SIZE / 2, TILE_SIZE / 2 - 10);
    g.lineTo(TILE_SIZE / 2 + 4, TILE_SIZE / 2 - 6);
    g.lineTo(TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 6);
    g.closePath();
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeCatchEntryTexture() {
    const g = new PIXI.Graphics();
    g.beginFill(0x8a3a3a);
    g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.endFill();
    g.beginFill(0xffaa44);
    g.drawRect(TILE_SIZE / 2 - 2, 6, 4, 12);
    g.drawRect(TILE_SIZE / 2 - 2, 22, 4, 4);
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makePlayerTexture(direction) {
    const g = new PIXI.Graphics();
    const s = TILE_SIZE;
    g.beginFill(0xcc5533);
    g.drawRoundedRect(s * 0.2, s * 0.15, s * 0.6, s * 0.7, 3);
    g.endFill();
    g.beginFill(0xffcc88);
    g.drawCircle(s / 2, s * 0.25, s * 0.18);
    g.endFill();
    g.beginFill(0x222222);
    if (direction === 0) {
      g.drawRect(s * 0.38, s * 0.25, 2, 2);
      g.drawRect(s * 0.58, s * 0.25, 2, 2);
    } else if (direction === 1) {
      g.drawRect(s * 0.38, s * 0.2, 2, 2);
      g.drawRect(s * 0.58, s * 0.2, 2, 2);
    } else if (direction === 2) {
      g.drawRect(s * 0.32, s * 0.25, 2, 2);
      g.drawRect(s * 0.48, s * 0.25, 2, 2);
    } else {
      g.drawRect(s * 0.48, s * 0.25, 2, 2);
      g.drawRect(s * 0.64, s * 0.25, 2, 2);
    }
    g.endFill();
    g.beginFill(0xaaaacc);
    g.drawRect(s * 0.75, s * 0.3, 3, s * 0.35);
    g.endFill();
    g.beginFill(0x886633);
    g.drawRect(s * 0.72, s * 0.6, 9, 3);
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeGemTexture(color, alpha) {
    const g = new PIXI.Graphics();
    g.beginFill(color, alpha);
    const s = TILE_SIZE;
    const cx = s / 2, cy = s / 2;
    g.moveTo(cx, cy - 8);
    g.lineTo(cx + 6, cy);
    g.lineTo(cx, cy + 8);
    g.lineTo(cx - 6, cy);
    g.closePath();
    g.endFill();
    g.beginFill(0xffffff, alpha * 0.4);
    g.moveTo(cx, cy - 5);
    g.lineTo(cx + 3, cy);
    g.lineTo(cx, cy - 2);
    g.lineTo(cx - 3, cy);
    g.closePath();
    g.endFill();
    return this._graphicsToTexture(g);
  }

  _makeWeaponTexture(color) {
    const g = new PIXI.Graphics();
    const s = TILE_SIZE;
    const cx = s / 2, cy = s / 2;

    // Outer glow
    g.beginFill(color, 0.25);
    g.drawCircle(cx, cy, s * 0.45);
    g.endFill();

    // Crystal / rune shape (hexagonal)
    g.beginFill(color);
    const r = s * 0.32;
    g.moveTo(cx, cy - r);
    g.lineTo(cx + r * 0.87, cy - r * 0.5);
    g.lineTo(cx + r * 0.87, cy + r * 0.5);
    g.lineTo(cx, cy + r);
    g.lineTo(cx - r * 0.87, cy + r * 0.5);
    g.lineTo(cx - r * 0.87, cy - r * 0.5);
    g.closePath();
    g.endFill();

    // Inner highlight
    g.beginFill(0xffffff, 0.35);
    const ir = r * 0.45;
    g.moveTo(cx, cy - ir);
    g.lineTo(cx + ir * 0.87, cy - ir * 0.5);
    g.lineTo(cx, cy + ir * 0.3);
    g.lineTo(cx - ir * 0.87, cy - ir * 0.5);
    g.closePath();
    g.endFill();

    return this._graphicsToTexture(g);
  }

  static textureKeyForType(type) {
    switch (type) {
      case 'number':  return 'weaponNumber';
      case 'string':  return 'weaponString';
      case 'boolean': return 'weaponBoolean';
      case 'array':   return 'weaponArray';
      default:        return 'weaponNumber';
    }
  }

  _graphicsToTexture(graphics) {
    const texture = this._renderer.generateTexture(graphics);
    graphics.destroy();
    return texture;
  }

  getTexture(name) {
    return this.textures[name] || this.textures.floor;
  }
}
