import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../constants.js';

export default class GemManager {
  constructor(spriteManager) {
    this.spriteManager = spriteManager;
    this.gems = new Map(); // gemId -> { sprite, x, y, statementId, collected, ghost }
    this.container = new PIXI.Container();
    this.animationTime = 0;
  }

  placeGems(gemPlacements, previouslyCollected = new Set()) {
    this.clear();
    for (const gem of gemPlacements) {
      const isGhost = previouslyCollected.has(gem.id);
      const texName = isGhost ? 'gemGhost' : 'gem';
      const sprite = new PIXI.Sprite(this.spriteManager.getTexture(texName));
      sprite.anchor.set(0, 0);
      sprite.x = gem.x * TILE_SIZE;
      sprite.y = gem.y * TILE_SIZE;
      if (isGhost) sprite.alpha = 0.4;

      this.container.addChild(sprite);
      this.gems.set(gem.id, {
        sprite,
        x: gem.x,
        y: gem.y,
        statementId: gem.statementId,
        collected: false,
        ghost: isGhost,
        baseY: gem.y * TILE_SIZE,
      });
    }
  }

  collectGem(gemId) {
    const gem = this.gems.get(gemId);
    if (!gem || gem.collected || gem.ghost) return false;
    gem.collected = true;
    gem.sprite.texture = this.spriteManager.getTexture('gemCollected');
    this._playCollectAnimation(gem);
    return true;
  }

  markCovered(coveredStatementIds) {
    for (const [id, gem] of this.gems) {
      if (coveredStatementIds.has(gem.statementId)) {
        if (!gem.ghost) {
          gem.collected = true;
          gem.sprite.texture = this.spriteManager.getTexture('gemCollected');
          this._playCollectAnimation(gem);
        }
      } else {
        if (!gem.ghost) {
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
      gem.sprite.scale.set(1 + Math.sin((frame / totalFrames) * Math.PI) * 0.3);
      if (frame >= totalFrames) {
        gem.sprite.y = gem.baseY;
        gem.sprite.scale.set(1);
        ticker.destroy();
      }
    });
    ticker.start();
  }

  dimUncovered() {
    for (const [, gem] of this.gems) {
      if (!gem.collected && !gem.ghost) {
        gem.sprite.alpha = 0.3;
      }
    }
  }

  getGemAt(gridX, gridY) {
    for (const [id, gem] of this.gems) {
      if (gem.x === gridX && gem.y === gridY && !gem.collected && !gem.ghost) {
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
