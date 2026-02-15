import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../constants.js';

// Gem scale factor (60% of tile size)
const GEM_SCALE = (TILE_SIZE / 16) * 0.6;

export default class GemManager {
  constructor(spriteManager, soundManager = null) {
    this.spriteManager = spriteManager;
    this.soundManager = soundManager;
    this.gems = new Map(); // gemId -> { sprite, x, y, statementId, collected }
    this.container = new PIXI.Container();
    this.animationTime = 0;
  }

  placeGems(gemPlacements, previouslyCollected = new Set()) {
    this.clear();
    console.log('[GemManager] Placing gems:', gemPlacements.length, 'previously collected:', previouslyCollected.size);
    for (const gem of gemPlacements) {
      const alreadyCovered = previouslyCollected.has(gem.id);
      // Already covered gems show as green (collected), uncovered as normal
      const texName = alreadyCovered ? 'gemCollected' : 'gem';
      const sprite = new PIXI.Sprite(this.spriteManager.getTexture(texName));
      sprite.anchor.set(0.5, 0.5);
      sprite.x = gem.x * TILE_SIZE + TILE_SIZE / 2;
      sprite.y = gem.y * TILE_SIZE + TILE_SIZE / 2;
      sprite.scale.set(GEM_SCALE, GEM_SCALE);

      this.container.addChild(sprite);
      this.gems.set(gem.id, {
        sprite,
        x: gem.x,
        y: gem.y,
        statementId: gem.statementId,
        collected: alreadyCovered, // Mark as already collected
        ghost: false,
        baseY: gem.y * TILE_SIZE + TILE_SIZE / 2,
      });

      const hasLoc = gem.loc ? `line ${gem.loc.start.line}:${gem.loc.start.column}` : 'NO LOC';
      console.log(`[GemManager] Gem ${gem.id} at (${gem.x},${gem.y}) ${hasLoc} ${alreadyCovered ? '[ALREADY COVERED]' : ''}`);
    }
  }

  collectGem(gemId) {
    const gem = this.gems.get(gemId);
    if (!gem || gem.collected) return false;
    gem.collected = true;
    gem.sprite.texture = this.spriteManager.getTexture('gemCollected');
    this._playCollectAnimation(gem);

    // Play gem collect sound
    if (this.soundManager) {
      this.soundManager.playGemCollect();
    }

    return true;
  }

  markCovered(coveredStatementIds) {
    for (const [id, gem] of this.gems) {
      if (coveredStatementIds.has(gem.statementId)) {
        if (!gem.collected) {
          gem.collected = true;
          gem.sprite.texture = this.spriteManager.getTexture('gemCollected');
          this._playCollectAnimation(gem);
        }
      } else {
        if (!gem.collected) {
          gem.sprite.alpha = 0.3;
        }
      }
    }
  }

  _playCollectAnimation(gem) {
    let frame = 0;
    const totalFrames = 20;
    const ticker = new PIXI.Ticker();
    ticker.add(() => {
      frame++;
      gem.sprite.y = gem.baseY - Math.sin((frame / totalFrames) * Math.PI) * 10;
      const scaleBoost = Math.sin((frame / totalFrames) * Math.PI) * 0.3;
      gem.sprite.scale.set(GEM_SCALE + scaleBoost, GEM_SCALE + scaleBoost);
      if (frame >= totalFrames) {
        gem.sprite.y = gem.baseY;
        gem.sprite.scale.set(GEM_SCALE, GEM_SCALE);
        ticker.destroy();
      }
    });
    ticker.start();
  }

  dimUncovered() {
    for (const [, gem] of this.gems) {
      if (!gem.collected) {
        gem.sprite.alpha = 0.3;
      }
    }
  }

  getGemAt(gridX, gridY) {
    for (const [id, gem] of this.gems) {
      if (gem.x === gridX && gem.y === gridY && !gem.collected) {
        return id;
      }
    }
    return null;
  }

  update(delta) {
    this.animationTime += delta * 0.05;
    // gentle floating animation for uncollected gems
    for (const [, gem] of this.gems) {
      if (!gem.collected) {
        gem.sprite.y = gem.baseY + Math.sin(this.animationTime + gem.x) * 2;
      }
    }
  }

  clear() {
    this.container.removeChildren();
    this.gems.clear();
  }

  getContainer() {
    return this.container;
  }
}
