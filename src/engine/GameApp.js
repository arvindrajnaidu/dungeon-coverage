import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';

export default class GameApp {
  constructor(container) {
    this.container = container;

    // Get initial dimensions
    const { width, height } = this._getContainerSize();

    this.app = new PIXI.Application({
      width: width,
      height: height,
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
      resizeTo: container,
    });
    container.appendChild(this.app.view);

    this.stage = this.app.stage;
    this.ticker = this.app.ticker;
    this.renderer = this.app.renderer;

    // Handle resize
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._resizeCallbacks = [];
  }

  _getContainerSize() {
    const rect = this.container.getBoundingClientRect();
    return {
      width: Math.max(rect.width, 320),
      height: Math.max(rect.height, 480),
    };
  }

  _onResize() {
    // Notify listeners
    for (const cb of this._resizeCallbacks) {
      cb(this.getScreenWidth(), this.getScreenHeight());
    }
  }

  onResize(callback) {
    this._resizeCallbacks.push(callback);
  }

  removeResize(callback) {
    const idx = this._resizeCallbacks.indexOf(callback);
    if (idx >= 0) this._resizeCallbacks.splice(idx, 1);
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

  isMobile() {
    return this.getScreenWidth() < 600;
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
}
