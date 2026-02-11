import * as PIXI from 'pixi.js';
import { COLORS, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import Panel from './Panel.js';
import Button from './Button.js';

export default class CodeModal {
  constructor() {
    this.container = new PIXI.Container();
    this.container.visible = false;
    this.scrollY = 0;
    this.maxScroll = 0;

    // Dimming overlay
    this.overlay = new PIXI.Graphics();
    this.overlay.beginFill(0x000000, 0.7);
    this.overlay.drawRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    this.overlay.endFill();
    this.overlay.eventMode = 'static';
    this.overlay.on('pointertap', () => this.hide());
    this.container.addChild(this.overlay);

    this.panel = null;
    this._onWheel = this._onWheel.bind(this);
  }

  show(source, levelName) {
    this.container.visible = true;
    this._buildPanel(source, levelName);
    // Listen for mouse wheel to scroll code
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.addEventListener('wheel', this._onWheel, { passive: false });
  }

  hide() {
    this.container.visible = false;
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.removeEventListener('wheel', this._onWheel);
  }

  _buildPanel(source, levelName) {
    if (this.panel) {
      this.container.removeChild(this.panel);
      this.panel.destroy({ children: true });
    }

    const panelW = 900;
    const panelH = 650;
    this.panel = new Panel(panelW, panelH);
    this.panel.centerOn(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Title
    const title = new PIXI.Text(levelName || 'SOURCE CODE', {
      fontFamily: 'monospace',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xffaa44,
    });
    title.anchor.set(0.5, 0);
    title.x = panelW / 2;
    title.y = 12;
    this.panel.addChild(title);

    // Close button
    const closeBtn = new Button('Close', 80, 30);
    closeBtn.x = panelW - 96;
    closeBtn.y = 8;
    closeBtn.onClick(() => this.hide());
    this.panel.addChild(closeBtn);

    // Code area
    const codeAreaY = 44;
    const codeAreaH = panelH - 60;

    // Code background
    const codeBg = new PIXI.Graphics();
    codeBg.beginFill(0x0a0a1a, 0.9);
    codeBg.drawRoundedRect(10, codeAreaY, panelW - 20, codeAreaH, 4);
    codeBg.endFill();
    this.panel.addChild(codeBg);

    // Add line numbers and syntax-highlighted code
    const lines = source.trim().split('\n');
    this.codeContent = new PIXI.Container();

    const lineHeight = 16;
    const gutterWidth = 40;

    for (let i = 0; i < lines.length; i++) {
      // Line number
      const lineNum = new PIXI.Text(`${i + 1}`, {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0x555577,
      });
      lineNum.x = 6;
      lineNum.y = i * lineHeight;
      this.codeContent.addChild(lineNum);

      // Code text
      const codeLine = new PIXI.Text(lines[i], {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: this._syntaxColor(lines[i]),
      });
      codeLine.x = gutterWidth;
      codeLine.y = i * lineHeight;
      this.codeContent.addChild(codeLine);
    }

    this.codeContent.x = 16;
    this.codeContent.y = codeAreaY + 8;

    // Mask for scrollable area
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawRect(10, codeAreaY, panelW - 20, codeAreaH);
    mask.endFill();
    this.panel.addChild(mask);
    this.codeContent.mask = mask;

    this.panel.addChild(this.codeContent);

    // Scroll state
    this.scrollY = 0;
    const contentHeight = lines.length * lineHeight + 16;
    this.maxScroll = Math.max(0, contentHeight - codeAreaH);
    this.codeAreaY = codeAreaY;

    this.container.addChild(this.panel);
  }

  _syntaxColor(line) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return 0x6a9955;
    if (/^\s*(function|const|let|var|return|if|else|for|while|switch|case|break|default|try|catch|finally|throw|new|await|async|export|import)\b/.test(line)) return 0xc586c0;
    if (/['"`]/.test(trimmed)) return 0xce9178;
    return 0xd4d4d4;
  }

  _onWheel(e) {
    if (!this.container.visible || !this.codeContent) return;
    e.preventDefault();
    this.scrollY = Math.min(this.maxScroll, Math.max(0, this.scrollY + e.deltaY * 0.5));
    this.codeContent.y = this.codeAreaY + 8 - this.scrollY;
  }

  get visible() {
    return this.container.visible;
  }

  getContainer() {
    return this.container;
  }
}
