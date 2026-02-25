import { TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CODE_PANEL_WIDTH, INVENTORY_PANEL_WIDTH } from '../constants.js';

// Dungeon area width (viewport minus code panel and inventory panel)
const DUNGEON_WIDTH = VIEWPORT_WIDTH - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;

export default class Camera {
  constructor(worldContainer, offsetX = 0, offsetY = 0) {
    this.worldContainer = worldContainer;
    this.targetX = 0;
    this.targetY = 0;
    this.smoothing = 0.1;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  setOffset(x, y) {
    this.offsetX = x;
    this.offsetY = y;
  }

  follow(gridX, gridY) {
    this.targetX = gridX * TILE_SIZE + TILE_SIZE / 2;
    this.targetY = gridY * TILE_SIZE + TILE_SIZE / 2;
  }

  update() {
    // Center within the dungeon area (right side of screen)
    const desiredX = this.offsetX + DUNGEON_WIDTH / 2 - this.targetX;
    const desiredY = this.offsetY + VIEWPORT_HEIGHT / 2 - this.targetY;

    this.worldContainer.x += (desiredX - this.worldContainer.x) * this.smoothing;
    this.worldContainer.y += (desiredY - this.worldContainer.y) * this.smoothing;
  }

  snapTo(gridX, gridY) {
    this.targetX = gridX * TILE_SIZE + TILE_SIZE / 2;
    this.targetY = gridY * TILE_SIZE + TILE_SIZE / 2;
    // Center within the dungeon area (right side of screen)
    this.worldContainer.x = this.offsetX + DUNGEON_WIDTH / 2 - this.targetX;
    this.worldContainer.y = this.offsetY + VIEWPORT_HEIGHT / 2 - this.targetY;
  }
}
