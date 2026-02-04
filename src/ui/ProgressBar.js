import * as PIXI from 'pixi.js';
import { COLORS } from '../constants.js';

export default class ProgressBar extends PIXI.Container {
  constructor(width = 200, height = 16) {
    super();
    this.barWidth = width;
    this.barHeight = height;
    this._progress = 0;

    this.bgBar = new PIXI.Graphics();
    this.bgBar.beginFill(COLORS.PROGRESS_BG);
    this.bgBar.drawRoundedRect(0, 0, width, height, 4);
    this.bgBar.endFill();
    this.addChild(this.bgBar);

    this.fillBar = new PIXI.Graphics();
    this.addChild(this.fillBar);

    this.label = new PIXI.Text('0%', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xffffff,
      align: 'center',
    });
    this.label.anchor.set(0.5);
    this.label.x = width / 2;
    this.label.y = height / 2;
    this.addChild(this.label);
  }

  setProgress(value) {
    this._progress = Math.max(0, Math.min(1, value));
    const fillWidth = Math.max(0, this.barWidth * this._progress);
    const color = this._progress >= 1 ? COLORS.PROGRESS_FILL : COLORS.PROGRESS_PARTIAL;

    this.fillBar.clear();
    if (fillWidth > 0) {
      this.fillBar.beginFill(color);
      this.fillBar.drawRoundedRect(0, 0, fillWidth, this.barHeight, 4);
      this.fillBar.endFill();
    }
    this.label.text = `${Math.round(this._progress * 100)}%`;
  }
}
