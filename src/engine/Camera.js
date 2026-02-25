import { TILE_SIZE, VIEWPORT_HEIGHT } from '../constants.js';

export default class Camera {
  constructor(worldContainer, offsetX = 0, offsetY = 0, dungeonWidth = 800) {
    this.worldContainer = worldContainer;
    this.targetX = 0;
    this.targetY = 0;
    this.smoothing = 0.1;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.dungeonWidth = dungeonWidth;
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
    // Center within the dungeon area (between code panel and inventory panel)
    const desiredX = this.offsetX + this.dungeonWidth / 2 - this.targetX;
    const desiredY = this.offsetY + VIEWPORT_HEIGHT / 2 - this.targetY;

    this.worldContainer.x += (desiredX - this.worldContainer.x) * this.smoothing;
    this.worldContainer.y += (desiredY - this.worldContainer.y) * this.smoothing;
  }

  snapTo(gridX, gridY) {
    this.targetX = gridX * TILE_SIZE + TILE_SIZE / 2;
    this.targetY = gridY * TILE_SIZE + TILE_SIZE / 2;
    // Center within the dungeon area (between code panel and inventory panel)
    this.worldContainer.x = this.offsetX + this.dungeonWidth / 2 - this.targetX;
    this.worldContainer.y = this.offsetY + VIEWPORT_HEIGHT / 2 - this.targetY;
  }
}
