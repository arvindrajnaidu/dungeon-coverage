import * as PIXI from 'pixi.js';
import { TILE_SIZE, COLORS } from '../constants.js';

const BASE = import.meta.env.BASE_URL;
const TILESET_PATH = `${BASE}sprites/0x72_DungeonTilesetII_v1.7/0x72_DungeonTilesetII_v1.7.png`;

export default class SpriteManager {
  constructor() {
    this.textures = {};
    this.loaded = false;
    this._renderer = null;
    this._baseTexture = null;
  }

  async load(renderer) {
    this._renderer = renderer;

    // Load the spritesheet
    this._baseTexture = await PIXI.Assets.load(TILESET_PATH);

    this._generateTextures();
    this.loaded = true;
  }

  // Extract a texture from the spritesheet
  _extractTexture(x, y, w, h) {
    const rect = new PIXI.Rectangle(x, y, w, h);
    return new PIXI.Texture(this._baseTexture, rect);
  }

  _generateTextures() {
    // ============================================
    // PLAYER: Knight character from spritesheet
    // ============================================
    // Idle animation frames (4 frames)
    this.textures.playerIdle0 = this._extractTexture(128, 100, 16, 28);
    this.textures.playerIdle1 = this._extractTexture(144, 100, 16, 28);
    this.textures.playerIdle2 = this._extractTexture(160, 100, 16, 28);
    this.textures.playerIdle3 = this._extractTexture(176, 100, 16, 28);

    // Run animation frames (4 frames)
    this.textures.playerRun0 = this._extractTexture(192, 100, 16, 28);
    this.textures.playerRun1 = this._extractTexture(208, 100, 16, 28);
    this.textures.playerRun2 = this._extractTexture(224, 100, 16, 28);
    this.textures.playerRun3 = this._extractTexture(240, 100, 16, 28);

    // Hit animation (1 frame)
    this.textures.playerHit = this._extractTexture(256, 100, 16, 28);

    // Legacy texture names for compatibility
    this.textures.playerDown = this.textures.playerIdle0;
    this.textures.playerUp = this.textures.playerIdle0;
    this.textures.playerLeft = this.textures.playerIdle0;
    this.textures.playerRight = this.textures.playerIdle0;
    this.textures.playerIdle = this.textures.playerIdle0;

    // ============================================
    // DUNGEON FLOOR TILES (16x16, scaled to 32x32)
    // ============================================
    this.textures.floor = this._extractTexture(16, 64, 16, 16);   // floor_1
    this.textures.floor2 = this._extractTexture(32, 64, 16, 16);  // floor_2
    this.textures.floor3 = this._extractTexture(48, 64, 16, 16);  // floor_3
    this.textures.floor4 = this._extractTexture(16, 80, 16, 16);  // floor_4
    this.textures.floor5 = this._extractTexture(32, 80, 16, 16);  // floor_5
    this.textures.floor6 = this._extractTexture(48, 80, 16, 16);  // floor_6
    this.textures.floor7 = this._extractTexture(16, 96, 16, 16);  // floor_7
    this.textures.floor8 = this._extractTexture(32, 96, 16, 16);  // floor_8

    // Corridor uses floor tiles
    this.textures.corridor = this._extractTexture(32, 80, 16, 16); // floor_5

    // ============================================
    // WALL TILES
    // ============================================
    this.textures.wall = this._extractTexture(32, 16, 16, 16);       // wall_mid
    this.textures.wallLeft = this._extractTexture(16, 16, 16, 16);   // wall_left
    this.textures.wallRight = this._extractTexture(48, 16, 16, 16);  // wall_right
    this.textures.wallTop = this._extractTexture(32, 0, 16, 16);     // wall_top_mid

    // ============================================
    // SPECIAL TILES - Using tileset elements with overlays
    // ============================================

    // Entry: Floor with ladder
    this.textures.entry = this._extractTexture(48, 96, 16, 16);   // floor_ladder

    // Exit: Floor with stairs
    this.textures.exit = this._extractTexture(80, 192, 16, 16);   // floor_stairs

    // Branch: Use lever/button as decision point indicator
    this.textures.branch = this._makeBranchTexture();

    // Merge: Converging paths
    this.textures.merge = this._makeMergeTexture();

    // Door tiles: Use arrow indicators
    this.textures.doorLeft = this._makeDoorTexture('left');
    this.textures.doorRight = this._makeDoorTexture('right');

    // Loop back
    this.textures.loopBack = this._makeLoopBackTexture();

    // Catch/Error entry
    this.textures.catchEntry = this._makeCatchEntryTexture();

    // ============================================
    // GEMS: Custom crystal sprites
    // ============================================
    // Generate custom gem graphics that look like actual gems/crystals
    this.textures.gem = this._makeGemTexture(0x44bbff, 0x2288dd);          // Blue crystal (uncollected)
    this.textures.gemCollected = this._makeGemTexture(0x44ff66, 0x22bb44); // Green crystal (collected)
    this.textures.gemGhost = this._makeGhostGemTexture();

    // Animation frames for gems (slight glow pulse)
    this.textures.gemFrame0 = this._makeGemTexture(0x44bbff, 0x2288dd, 0.8);
    this.textures.gemFrame1 = this._makeGemTexture(0x55ccff, 0x3399ee, 0.9);
    this.textures.gemFrame2 = this._makeGemTexture(0x66ddff, 0x44aaff, 1.0);
    this.textures.gemFrame3 = this._makeGemTexture(0x55ccff, 0x3399ee, 0.9);

    // ============================================
    // WEAPONS/RUNES: Keep generated for magic feel
    // ============================================
    this.textures.weaponNumber = this._makeWeaponTexture(COLORS.WEAPON_NUMBER);
    this.textures.weaponString = this._makeWeaponTexture(COLORS.WEAPON_STRING);
    this.textures.weaponBoolean = this._makeWeaponTexture(COLORS.WEAPON_BOOLEAN);
    this.textures.weaponArray = this._makeWeaponTexture(COLORS.WEAPON_ARRAY);
    this.textures.weaponJson = this._makeWeaponTexture(COLORS.WEAPON_JSON);
    this.textures.weaponStub = this._makeWeaponTexture(COLORS.WEAPON_STUB);

    // ============================================
    // UI ELEMENTS from tileset
    // ============================================
    this.textures.heartFull = this._extractTexture(289, 370, 13, 12);
    this.textures.heartHalf = this._extractTexture(305, 370, 13, 12);
    this.textures.heartEmpty = this._extractTexture(321, 370, 13, 12);

    // Chest sprites for potential future use
    this.textures.chestClosed = this._extractTexture(304, 416, 16, 16);
    this.textures.chestOpen = this._extractTexture(336, 416, 16, 16);
  }

  // Get idle animation frames array
  getIdleFrames() {
    return [
      this.textures.playerIdle0,
      this.textures.playerIdle1,
      this.textures.playerIdle2,
      this.textures.playerIdle3,
    ];
  }

  // Get run animation frames array
  getRunFrames() {
    return [
      this.textures.playerRun0,
      this.textures.playerRun1,
      this.textures.playerRun2,
      this.textures.playerRun3,
    ];
  }

  // Get gem animation frames
  getGemFrames() {
    return [
      this.textures.gemFrame0,
      this.textures.gemFrame1,
      this.textures.gemFrame2,
      this.textures.gemFrame3,
    ];
  }

  // ============================================
  // Generated textures for special game elements
  // ============================================

  _makeGemTexture(color, shadowColor, glowIntensity = 1.0) {
    const g = new PIXI.Graphics();
    const s = 16;
    const cx = s / 2, cy = s / 2;

    // Outer glow
    g.beginFill(color, 0.2 * glowIntensity);
    g.drawCircle(cx, cy, 7);
    g.endFill();

    // Crystal shape (hexagonal/diamond)
    // Main body
    g.beginFill(shadowColor);
    g.moveTo(cx, cy - 6);      // top
    g.lineTo(cx + 5, cy - 2);  // top-right
    g.lineTo(cx + 5, cy + 3);  // bottom-right
    g.lineTo(cx, cy + 6);      // bottom
    g.lineTo(cx - 5, cy + 3);  // bottom-left
    g.lineTo(cx - 5, cy - 2);  // top-left
    g.closePath();
    g.endFill();

    // Lighter left face
    g.beginFill(color);
    g.moveTo(cx, cy - 6);      // top
    g.lineTo(cx, cy + 6);      // bottom
    g.lineTo(cx - 5, cy + 3);  // bottom-left
    g.lineTo(cx - 5, cy - 2);  // top-left
    g.closePath();
    g.endFill();

    // Highlight on top-left
    g.beginFill(0xffffff, 0.5);
    g.moveTo(cx - 1, cy - 5);
    g.lineTo(cx - 4, cy - 2);
    g.lineTo(cx - 4, cy);
    g.lineTo(cx - 1, cy - 2);
    g.closePath();
    g.endFill();

    // Bright sparkle
    g.beginFill(0xffffff, 0.8);
    g.drawCircle(cx - 2, cy - 3, 1.5);
    g.endFill();

    // Small sparkle
    g.beginFill(0xffffff, 0.6);
    g.drawCircle(cx + 1, cy - 1, 0.8);
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _makeGhostGemTexture() {
    // Create a dimmed/ghostly version of the gem
    const g = new PIXI.Graphics();
    const s = 16;
    const cx = s / 2, cy = s / 2;

    // Faint outline
    g.beginFill(0x555577, 0.3);
    g.moveTo(cx, cy - 6);
    g.lineTo(cx + 5, cy - 2);
    g.lineTo(cx + 5, cy + 3);
    g.lineTo(cx, cy + 6);
    g.lineTo(cx - 5, cy + 3);
    g.lineTo(cx - 5, cy - 2);
    g.closePath();
    g.endFill();

    // Inner shape
    g.beginFill(0x444466, 0.2);
    g.moveTo(cx, cy - 4);
    g.lineTo(cx + 3, cy - 1);
    g.lineTo(cx + 3, cy + 2);
    g.lineTo(cx, cy + 4);
    g.lineTo(cx - 3, cy + 2);
    g.lineTo(cx - 3, cy - 1);
    g.closePath();
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _makeBranchTexture() {
    // Floor tile with glowing decision diamond overlay
    const g = new PIXI.Graphics();
    const s = 16;
    const cx = s / 2, cy = s / 2;

    // Base floor color
    g.beginFill(0x3a3a4a);
    g.drawRect(0, 0, s, s);
    g.endFill();

    // Subtle floor pattern
    g.beginFill(0x4a4a5a, 0.5);
    g.drawRect(1, 1, s-2, s-2);
    g.endFill();

    // Outer glow
    g.beginFill(0xffaa44, 0.2);
    g.drawCircle(cx, cy, 7);
    g.endFill();

    // Diamond decision marker
    g.beginFill(0xffaa44);
    g.moveTo(cx, cy - 5);
    g.lineTo(cx + 5, cy);
    g.lineTo(cx, cy + 5);
    g.lineTo(cx - 5, cy);
    g.closePath();
    g.endFill();

    // Inner highlight
    g.beginFill(0xffdd88);
    g.moveTo(cx, cy - 3);
    g.lineTo(cx + 3, cy);
    g.lineTo(cx, cy + 3);
    g.lineTo(cx - 3, cy);
    g.closePath();
    g.endFill();

    // Center glow
    g.beginFill(0xffffcc);
    g.drawCircle(cx, cy, 1);
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _makeMergeTexture() {
    const g = new PIXI.Graphics();
    const s = 16;
    const cx = s / 2;

    // Floor base
    g.beginFill(0x3a3a4a);
    g.drawRect(0, 0, s, s);
    g.endFill();

    g.beginFill(0x4a4a5a, 0.5);
    g.drawRect(1, 1, s-2, s-2);
    g.endFill();

    // Merge indicator (downward triangle)
    g.beginFill(0x8888aa, 0.8);
    g.moveTo(cx - 4, s/2 - 3);
    g.lineTo(cx + 4, s/2 - 3);
    g.lineTo(cx, s/2 + 4);
    g.closePath();
    g.endFill();

    g.beginFill(0xaaaacc, 0.6);
    g.moveTo(cx - 2, s/2 - 2);
    g.lineTo(cx + 2, s/2 - 2);
    g.lineTo(cx, s/2 + 1);
    g.closePath();
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _makeDoorTexture(side) {
    const g = new PIXI.Graphics();
    const s = 16;
    const cy = s / 2;

    // Floor base
    g.beginFill(0x3a3a4a);
    g.drawRect(0, 0, s, s);
    g.endFill();

    g.beginFill(0x4a4a5a, 0.5);
    g.drawRect(1, 1, s-2, s-2);
    g.endFill();

    // Direction arrow
    g.beginFill(0x8899aa, 0.8);
    if (side === 'left') {
      g.moveTo(s - 4, cy - 3);
      g.lineTo(4, cy);
      g.lineTo(s - 4, cy + 3);
    } else {
      g.moveTo(4, cy - 3);
      g.lineTo(s - 4, cy);
      g.lineTo(4, cy + 3);
    }
    g.closePath();
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _makeLoopBackTexture() {
    const g = new PIXI.Graphics();
    const s = 16;
    const cx = s / 2, cy = s / 2;

    // Floor base
    g.beginFill(0x3a3a4a);
    g.drawRect(0, 0, s, s);
    g.endFill();

    g.beginFill(0x4a4a5a, 0.5);
    g.drawRect(1, 1, s-2, s-2);
    g.endFill();

    // Circular arrow
    g.lineStyle(2, 0x88ddaa, 0.8);
    g.arc(cx, cy, 5, -Math.PI * 0.7, Math.PI * 0.5);

    // Arrowhead
    g.lineStyle(0);
    g.beginFill(0x88ddaa);
    g.moveTo(cx + 1, cy - 6);
    g.lineTo(cx + 4, cy - 3);
    g.lineTo(cx, cy - 2);
    g.closePath();
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _makeCatchEntryTexture() {
    const g = new PIXI.Graphics();
    const s = 16;
    const cx = s / 2;

    // Dark red floor
    g.beginFill(0x4a2a2a);
    g.drawRect(0, 0, s, s);
    g.endFill();

    // Warning glow
    g.beginFill(0xff6644, 0.2);
    g.drawCircle(cx, s/2, 6);
    g.endFill();

    // Exclamation mark
    g.beginFill(0xffaa44);
    g.drawRect(cx - 1, 4, 2, 6);
    g.drawCircle(cx, 12, 1);
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _makeWeaponTexture(color) {
    const g = new PIXI.Graphics();
    const s = TILE_SIZE;
    const cx = s / 2, cy = s / 2;

    // Outer glow
    g.beginFill(color, 0.15);
    g.drawCircle(cx, cy, s * 0.48);
    g.endFill();

    g.beginFill(color, 0.25);
    g.drawCircle(cx, cy, s * 0.38);
    g.endFill();

    // Hexagonal crystal
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

    // Shadow
    g.beginFill(0x000000, 0.25);
    g.moveTo(cx, cy);
    g.lineTo(cx + r * 0.87, cy + r * 0.5);
    g.lineTo(cx, cy + r);
    g.lineTo(cx - r * 0.87, cy + r * 0.5);
    g.closePath();
    g.endFill();

    // Highlight
    g.beginFill(0xffffff, 0.4);
    const ir = r * 0.5;
    g.moveTo(cx, cy - r + 2);
    g.lineTo(cx + ir * 0.7, cy - ir * 0.3);
    g.lineTo(cx, cy);
    g.lineTo(cx - ir * 0.7, cy - ir * 0.3);
    g.closePath();
    g.endFill();

    // Sparkle
    g.beginFill(0xffffff, 0.6);
    g.drawCircle(cx - 2, cy - 3, 2);
    g.endFill();

    return this._graphicsToTexture(g);
  }

  _graphicsToTexture(graphics) {
    const texture = this._renderer.generateTexture(graphics);
    graphics.destroy();
    return texture;
  }

  static textureKeyForType(type) {
    switch (type) {
      case 'number':  return 'weaponNumber';
      case 'string':  return 'weaponString';
      case 'boolean': return 'weaponBoolean';
      case 'array':   return 'weaponArray';
      case 'json':    return 'weaponJson';
      case 'stub':    return 'weaponStub';
      default:        return 'weaponNumber';
    }
  }

  getTexture(name) {
    return this.textures[name] || this.textures.floor;
  }
}
