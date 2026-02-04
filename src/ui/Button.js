import * as PIXI from 'pixi.js';
import { COLORS } from '../constants.js';

export default class Button extends PIXI.Container {
  constructor(text, width = 200, height = 40) {
    super();
    this.buttonWidth = width;
    this.buttonHeight = height;
    this._disabled = false;

    this.bg = new PIXI.Graphics();
    this._drawBg(COLORS.BUTTON_BG);
    this.addChild(this.bg);

    this.label = new PIXI.Text(text, {
      fontFamily: 'monospace',
      fontSize: 14,
      fill: COLORS.BUTTON_TEXT,
      align: 'center',
    });
    this.label.anchor.set(0.5);
    this.label.x = width / 2;
    this.label.y = height / 2;
    this.addChild(this.label);

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      if (!this._disabled) this._drawBg(COLORS.BUTTON_HOVER);
    });
    this.on('pointerout', () => {
      if (!this._disabled) this._drawBg(COLORS.BUTTON_BG);
    });
  }

  _drawBg(color) {
    this.bg.clear();
    this.bg.beginFill(color);
    this.bg.lineStyle(2, COLORS.PANEL_BORDER);
    this.bg.drawRoundedRect(0, 0, this.buttonWidth, this.buttonHeight, 6);
    this.bg.endFill();
  }

  onClick(callback) {
    this.on('pointertap', () => {
      if (!this._disabled) callback();
    });
    return this;
  }

  setDisabled(disabled) {
    this._disabled = disabled;
    this.alpha = disabled ? 0.4 : 1;
    this.cursor = disabled ? 'default' : 'pointer';
  }

  setText(text) {
    this.label.text = text;
  }
}
