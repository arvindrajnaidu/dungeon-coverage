import * as PIXI from 'pixi.js';
import { TILE_SIZE, TILE_TYPES } from '../constants.js';

const TEXTURE_MAP = {
  [TILE_TYPES.FLOOR]: 'floor',
  [TILE_TYPES.WALL]: 'wall',
  [TILE_TYPES.BRANCH]: 'branch',
  [TILE_TYPES.MERGE]: 'merge',
  [TILE_TYPES.EXIT]: 'exit',
  [TILE_TYPES.ENTRY]: 'entry',
  [TILE_TYPES.CORRIDOR_H]: 'corridor',
  [TILE_TYPES.CORRIDOR_V]: 'corridor',
  [TILE_TYPES.DOOR_LEFT]: 'doorLeft',
  [TILE_TYPES.DOOR_RIGHT]: 'doorRight',
  [TILE_TYPES.LOOP_BACK]: 'loopBack',
  [TILE_TYPES.CATCH_ENTRY]: 'catchEntry',
};

const WALKABLE = new Set([
  TILE_TYPES.FLOOR,
  TILE_TYPES.BRANCH,
  TILE_TYPES.MERGE,
  TILE_TYPES.EXIT,
  TILE_TYPES.ENTRY,
  TILE_TYPES.CORRIDOR_H,
  TILE_TYPES.CORRIDOR_V,
  TILE_TYPES.DOOR_LEFT,
  TILE_TYPES.DOOR_RIGHT,
  TILE_TYPES.LOOP_BACK,
  TILE_TYPES.CATCH_ENTRY,
]);

export default class DungeonMap {
  constructor(spriteManager) {
    this.spriteManager = spriteManager;
    this.grid = [];
    this.tileData = []; // metadata per tile (statementId, branchId, etc.)
    this.width = 0;
    this.height = 0;
    this.container = new PIXI.Container();
    this.entryPoint = { x: 0, y: 0 };
    this.exitPoint = { x: 0, y: 0 };
    this.branchTiles = [];
    this.walledOffTiles = new Set(); // tiles walled off after a branch decision
  }

  loadFromLayout(layout) {
    // layout: { grid: number[][], tileData: object[][], entry: {x,y}, exit: {x,y}, branches: [...] }
    this.grid = layout.grid;
    this.tileData = layout.tileData || [];
    this.width = layout.grid[0]?.length || 0;
    this.height = layout.grid.length;
    this.entryPoint = layout.entry || { x: 0, y: 0 };
    this.exitPoint = layout.exit || { x: this.width - 1, y: this.height - 1 };
    this.branchTiles = layout.branches || [];
    this.walledOffTiles.clear();
    this._render();
  }

  _render() {
    this.container.removeChildren();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tileType = this.grid[y][x];
        const texName = TEXTURE_MAP[tileType] || 'wall';
        const sprite = new PIXI.Sprite(this.spriteManager.getTexture(texName));
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
        sprite.anchor.set(0, 0);
        // Scale 16x16 tileset sprites to 32x32
        sprite.scale.set(2, 2);
        this.container.addChild(sprite);
      }
    }
  }

  wallOff(tilePositions) {
    for (const pos of tilePositions) {
      const key = `${pos.x},${pos.y}`;
      this.walledOffTiles.add(key);
      this.grid[pos.y][pos.x] = TILE_TYPES.WALL;
    }
    this._render();
  }

  isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const key = `${x},${y}`;
    if (this.walledOffTiles.has(key)) return false;
    return WALKABLE.has(this.grid[y][x]);
  }

  getTileType(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return TILE_TYPES.EMPTY;
    return this.grid[y][x];
  }

  getTileData(x, y) {
    if (!this.tileData[y] || !this.tileData[y][x]) return null;
    return this.tileData[y][x];
  }

  getContainer() {
    return this.container;
  }

  getBranchAt(x, y) {
    return this.branchTiles.find(b => b.x === x && b.y === y) || null;
  }
}
