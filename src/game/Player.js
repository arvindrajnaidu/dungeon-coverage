import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../constants.js';

export default class Player {
  constructor(spriteManager) {
    this.spriteManager = spriteManager;
    this.container = new PIXI.Container();

    this.gridX = 0;
    this.gridY = 0;
    this.pixelX = 0;
    this.pixelY = 0;

    // Movement interpolation
    this.targetPixelX = 0;
    this.targetPixelY = 0;
    this.moveSpeed = 2; // pixels per frame (slow walk)

    // Auto-walk path
    this.walkPath = []; // array of { x, y } grid positions
    this.walking = false;

    // Sprite
    this.sprite = new PIXI.Sprite(spriteManager.getTexture('playerDown'));
    this.sprite.anchor.set(0, 0);
    this.container.addChild(this.sprite);

    // Direction textures
    this.dirTextures = {
      down: spriteManager.getTexture('playerDown'),
      up: spriteManager.getTexture('playerUp'),
      left: spriteManager.getTexture('playerLeft'),
      right: spriteManager.getTexture('playerRight'),
    };
  }

  setPosition(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.pixelX = gridX * TILE_SIZE;
    this.pixelY = gridY * TILE_SIZE;
    this.targetPixelX = this.pixelX;
    this.targetPixelY = this.pixelY;
    this.sprite.x = this.pixelX;
    this.sprite.y = this.pixelY;
  }

  setWalkPath(path) {
    this.walkPath = path.slice(); // copy
    this.walking = true;
  }

  isMoving() {
    return this.walking || this.pixelX !== this.targetPixelX || this.pixelY !== this.targetPixelY;
  }

  // Returns true when the player has just arrived at a new grid tile
  update() {
    let arrivedAtNewTile = false;

    // Interpolate toward target pixel position
    const dx = this.targetPixelX - this.pixelX;
    const dy = this.targetPixelY - this.pixelY;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      // Still moving to current target
      if (Math.abs(dx) <= this.moveSpeed) {
        this.pixelX = this.targetPixelX;
      } else {
        this.pixelX += Math.sign(dx) * this.moveSpeed;
      }
      if (Math.abs(dy) <= this.moveSpeed) {
        this.pixelY = this.targetPixelY;
      } else {
        this.pixelY += Math.sign(dy) * this.moveSpeed;
      }
    } else {
      // Arrived at target tile — advance to next in path
      this.pixelX = this.targetPixelX;
      this.pixelY = this.targetPixelY;

      if (this.walkPath.length > 0) {
        const next = this.walkPath.shift();
        this._stepTo(next.x, next.y);
        arrivedAtNewTile = true;
      } else {
        this.walking = false;
      }
    }

    this.sprite.x = this.pixelX;
    this.sprite.y = this.pixelY;

    return arrivedAtNewTile;
  }

  _stepTo(gx, gy) {
    const dx = gx - this.gridX;
    const dy = gy - this.gridY;

    // Update facing direction
    if (dy > 0) this.sprite.texture = this.dirTextures.down;
    else if (dy < 0) this.sprite.texture = this.dirTextures.up;
    else if (dx < 0) this.sprite.texture = this.dirTextures.left;
    else if (dx > 0) this.sprite.texture = this.dirTextures.right;

    this.gridX = gx;
    this.gridY = gy;
    this.targetPixelX = gx * TILE_SIZE;
    this.targetPixelY = gy * TILE_SIZE;
  }

  getContainer() {
    return this.container;
  }
}
