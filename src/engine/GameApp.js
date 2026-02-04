import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

export default class GameApp {
  constructor(container) {
    this.app = new PIXI.Application({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });
    container.appendChild(this.app.view);
    this.app.view.style.width = '100%';
    this.app.view.style.height = '100%';

    this.stage = this.app.stage;
    this.ticker = this.app.ticker;
    this.renderer = this.app.renderer;
  }

  addChild(child) {
    this.stage.addChild(child);
  }

  removeChild(child) {
    this.stage.removeChild(child);
  }

  onUpdate(callback) {
    this.ticker.add(callback);
  }

  removeUpdate(callback) {
    this.ticker.remove(callback);
  }

  getScreenWidth() {
    return this.renderer.width / this.renderer.resolution;
  }

  getScreenHeight() {
    return this.renderer.height / this.renderer.resolution;
  }

  destroy() {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
}
