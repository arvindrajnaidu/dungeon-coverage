import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../constants.js';
import Button from '../ui/Button.js';

export default class VictoryScene {
  constructor(sceneManager, soundManager = null) {
    this.sceneManager = sceneManager;
    this.soundManager = soundManager;
    this.container = new PIXI.Container();
    this.particles = [];
    this.time = 0;
  }

  async enter() {
    this.container.removeChildren();
    this.particles = [];

    // Get actual screen dimensions
    const gameApp = this.sceneManager.gameApp;
    this.screenW = gameApp.getScreenWidth();
    this.screenH = gameApp.getScreenHeight();

    // Play victory fanfare
    if (this.soundManager) {
      this.soundManager.play('victory');
    }

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0a0a1e);
    bg.drawRect(0, 0, this.screenW, this.screenH);
    bg.endFill();
    this.container.addChild(bg);

    // Particle container
    this.particleContainer = new PIXI.Container();
    this.container.addChild(this.particleContainer);
    this._createParticles();

    // Title
    const title = new PIXI.Text('VICTORY!', {
      fontFamily: 'monospace',
      fontSize: 52,
      fontWeight: 'bold',
      fill: [0xffdd44, 0xff6644],
      align: 'center',
    });
    title.anchor.set(0.5);
    title.x = this.screenW / 2;
    title.y = 140;
    this.container.addChild(title);

    // Subtitle
    const sub1 = new PIXI.Text('100% Coverage Achieved!', {
      fontFamily: 'monospace',
      fontSize: 20,
      fill: 0x44ff44,
      align: 'center',
    });
    sub1.anchor.set(0.5);
    sub1.x = this.screenW / 2;
    sub1.y = 200;
    this.container.addChild(sub1);

    const sub2 = new PIXI.Text('All dungeons conquered. Every path explored.', {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xaaaacc,
      align: 'center',
    });
    sub2.anchor.set(0.5);
    sub2.x = this.screenW / 2;
    sub2.y = 240;
    this.container.addChild(sub2);

    const sub3 = new PIXI.Text('No branch left untested. No statement uncovered.', {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xaaaacc,
      align: 'center',
    });
    sub3.anchor.set(0.5);
    sub3.x = this.screenW / 2;
    sub3.y = 265;
    this.container.addChild(sub3);

    // Play again button
    const btn = new Button('Play Again', 200, 40);
    btn.x = (this.screenW - 200) / 2;
    btn.y = 340;
    btn.onClick(() => {
      this.sceneManager.switchTo('title', { unlockedLevels: 7 });
    });
    this.container.addChild(btn);
  }

  _createParticles() {
    const colors = [0xffdd44, 0xff6644, 0x44ff44, 0x44aaff, 0xff44ff];
    for (let i = 0; i < 50; i++) {
      const g = new PIXI.Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      g.beginFill(color, 0.7);
      g.drawRect(0, 0, 4, 4);
      g.endFill();
      g.x = Math.random() * this.screenW;
      g.y = Math.random() * this.screenH;
      this.particleContainer.addChild(g);
      this.particles.push({
        sprite: g,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2 - 0.5,
        life: Math.random() * 200,
      });
    }
  }

  update(delta) {
    this.time += delta;
    for (const p of this.particles) {
      p.sprite.x += p.vx;
      p.sprite.y += p.vy;
      p.life -= delta;
      if (p.sprite.y < -10 || p.life <= 0) {
        p.sprite.x = Math.random() * this.screenW;
        p.sprite.y = this.screenH + 10;
        p.vy = -Math.random() * 2 - 0.5;
        p.life = Math.random() * 200;
      }
      p.sprite.alpha = 0.3 + Math.sin(this.time * 0.05 + p.sprite.x) * 0.3;
    }
  }

  exit() {}

  getContainer() {
    return this.container;
  }
}
