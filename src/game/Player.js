import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../constants.js';

export default class Player {
  constructor(spriteManager, soundManager = null) {
    this.spriteManager = spriteManager;
    this.soundManager = soundManager;
    this.container = new PIXI.Container();

    this.gridX = 0;
    this.gridY = 0;
    this.pixelX = 0;
    this.pixelY = 0;

    // Movement interpolation
    this.targetPixelX = 0;
    this.targetPixelY = 0;
    this.moveSpeed = 2; // pixels per frame (half speed)

    // Auto-walk path
    this.walkPath = []; // array of { x, y, action } - action is 'walk' or 'teleport'
    this.walking = false;
    this.teleporting = false;
    this.teleportPhase = 0; // 0=fadeOut, 1=move, 2=fadeIn
    this.teleportTarget = null;

    // Animation frames
    this.idleFrames = spriteManager.getIdleFrames();
    this.runFrames = spriteManager.getRunFrames();
    this.hitTexture = spriteManager.getTexture('playerHit');

    // Sprite - scale up to fit tile size
    this.sprite = new PIXI.Sprite(this.idleFrames[0]);
    this.sprite.anchor.set(0.5, 0.7); // anchor near feet
    const scale = TILE_SIZE / 16;
    this.sprite.scale.set(scale, scale);
    this.container.addChild(this.sprite);

    // Animation state
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 8; // frames between animation updates

    // Idle state
    this.idleTime = 0;
  }

  setPosition(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.pixelX = gridX * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = gridY * TILE_SIZE + TILE_SIZE / 2;
    this.targetPixelX = this.pixelX;
    this.targetPixelY = this.pixelY;
    this.sprite.x = this.pixelX;
    this.sprite.y = this.pixelY;
  }

  setWalkPath(path) {
    this.walkPath = path.slice(); // copy
    this.walking = true;
    this.animFrame = 0;
    this.animTimer = 0;
  }

  isMoving() {
    return this.walking || this.teleporting || this.pixelX !== this.targetPixelX || this.pixelY !== this.targetPixelY;
  }

  // Returns true when the player has just arrived at a new grid tile
  update() {
    let arrivedAtNewTile = false;

    // Handle teleport animation
    if (this.teleporting) {
      arrivedAtNewTile = this._updateTeleport();
      return arrivedAtNewTile;
    }

    // Interpolate toward target pixel position
    const dx = this.targetPixelX - this.pixelX;
    const dy = this.targetPixelY - this.pixelY;

    const isCurrentlyMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;

    if (isCurrentlyMoving) {
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

      // Flip sprite based on movement direction
      if (dx < -0.5) {
        this.sprite.scale.x = -2; // Face left
      } else if (dx > 0.5) {
        this.sprite.scale.x = 2; // Face right
      }

      // Run animation
      this._updateAnimation(this.runFrames, 6);
      this.idleTime = 0;
    } else {
      // Arrived at target tile — advance to next in path
      this.pixelX = this.targetPixelX;
      this.pixelY = this.targetPixelY;

      if (this.walkPath.length > 0) {
        const next = this.walkPath.shift();
        if (next.action === 'teleport') {
          this._startTeleport(next.x, next.y);
        } else {
          this._stepTo(next.x, next.y);
          arrivedAtNewTile = true;
        }
      } else {
        this.walking = false;
        // Idle animation
        this._updateAnimation(this.idleFrames, 10);
        this.idleTime++;
      }
    }

    this.sprite.x = this.pixelX;
    this.sprite.y = this.pixelY;

    return arrivedAtNewTile;
  }

  _startTeleport(gx, gy) {
    this.teleporting = true;
    this.teleportPhase = 0;
    this.teleportTarget = { x: gx, y: gy };
    // Play teleport/transition sound
    if (this.soundManager) {
      this.soundManager.play('sceneTransition');
    }
  }

  _updateTeleport() {
    const fadeSpeed = 0.1;

    if (this.teleportPhase === 0) {
      // Fade out
      this.sprite.alpha -= fadeSpeed;
      if (this.sprite.alpha <= 0) {
        this.sprite.alpha = 0;
        this.teleportPhase = 1;
      }
    } else if (this.teleportPhase === 1) {
      // Instantly move to target
      this.gridX = this.teleportTarget.x;
      this.gridY = this.teleportTarget.y;
      this.pixelX = this.gridX * TILE_SIZE + TILE_SIZE / 2;
      this.pixelY = this.gridY * TILE_SIZE + TILE_SIZE / 2;
      this.targetPixelX = this.pixelX;
      this.targetPixelY = this.pixelY;
      this.sprite.x = this.pixelX;
      this.sprite.y = this.pixelY;
      this.teleportPhase = 2;
      return true; // Arrived at new tile
    } else if (this.teleportPhase === 2) {
      // Fade in
      this.sprite.alpha += fadeSpeed;
      if (this.sprite.alpha >= 1) {
        this.sprite.alpha = 1;
        this.teleporting = false;
        this.teleportTarget = null;
      }
    }
    return false;
  }

  _updateAnimation(frames, speed) {
    this.animTimer++;
    if (this.animTimer >= speed) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % frames.length;
      this.sprite.texture = frames[this.animFrame];
    }
  }

  _stepTo(gx, gy) {
    const dx = gx - this.gridX;
    const dy = gy - this.gridY;

    // Flip sprite based on direction
    if (dx < 0) {
      this.sprite.scale.x = -2; // Face left
    } else if (dx > 0) {
      this.sprite.scale.x = 2; // Face right
    }

    this.gridX = gx;
    this.gridY = gy;
    this.targetPixelX = gx * TILE_SIZE + TILE_SIZE / 2;
    this.targetPixelY = gy * TILE_SIZE + TILE_SIZE / 2;

    // Play footstep sound
    if (this.soundManager) {
      this.soundManager.playFootstep();
    }
  }

  getContainer() {
    return this.container;
  }
}
