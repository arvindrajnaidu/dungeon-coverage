import * as PIXI from 'pixi.js';
import { COLORS } from '../constants.js';

export default class Panel extends PIXI.Container {
  constructor(width, height) {
    super();
    this.panelWidth = width;
    this.panelHeight = height;

    this.bg = new PIXI.Graphics();
    this.bg.beginFill(COLORS.PANEL_BG, 0.95);
    this.bg.lineStyle(2, COLORS.PANEL_BORDER);
    this.bg.drawRoundedRect(0, 0, width, height, 8);
    this.bg.endFill();
    this.addChild(this.bg);
  }

  centerOn(screenWidth, screenHeight) {
    this.x = (screenWidth - this.panelWidth) / 2;
    this.y = (screenHeight - this.panelHeight) / 2;
  }
}
