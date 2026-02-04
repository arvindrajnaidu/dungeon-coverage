import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS } from '../constants.js';
import Button from '../ui/Button.js';
import levels from '../levels/index.js';

export default class TitleScene {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.container = new PIXI.Container();
    this.unlockedLevels = 1; // start with level 1 unlocked
  }

  async enter(data = {}) {
    this.container.removeChildren();
    if (data.unlockedLevels) this.unlockedLevels = data.unlockedLevels;

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a2e);
    bg.drawRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    bg.endFill();
    this.container.addChild(bg);

    // Title
    const title = new PIXI.Text('DUNGEON\nCOVERAGE', {
      fontFamily: 'monospace',
      fontSize: 42,
      fontWeight: 'bold',
      fill: [0xffaa44, 0xff6644],
      align: 'center',
      lineHeight: 50,
    });
    title.anchor.set(0.5);
    title.x = VIEWPORT_WIDTH / 2;
    title.y = 100;
    this.container.addChild(title);

    // Subtitle
    const subtitle = new PIXI.Text('Navigate dungeons. Choose paths. Achieve 100% coverage.', {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xaaaacc,
      align: 'center',
    });
    subtitle.anchor.set(0.5);
    subtitle.x = VIEWPORT_WIDTH / 2;
    subtitle.y = 155;
    this.container.addChild(subtitle);

    // Level buttons
    const startY = 200;
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const isUnlocked = i < this.unlockedLevels;
      const btn = new Button(
        `${i + 1}. ${level.name}${isUnlocked ? '' : ' [LOCKED]'}`,
        320, 36
      );
      btn.x = (VIEWPORT_WIDTH - 320) / 2;
      btn.y = startY + i * 46;
      btn.setDisabled(!isUnlocked);

      if (isUnlocked) {
        btn.onClick(() => {
          this.sceneManager.switchTo('level', { levelIndex: i });
        });
      }
      this.container.addChild(btn);
    }

    // Instructions
    const instructions = new PIXI.Text(
      'Provide function inputs | Watch code paths light up',
      {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0x666688,
        align: 'center',
      }
    );
    instructions.anchor.set(0.5);
    instructions.x = VIEWPORT_WIDTH / 2;
    instructions.y = VIEWPORT_HEIGHT - 30;
    this.container.addChild(instructions);
  }

  exit() {}

  update() {}

  getContainer() {
    return this.container;
  }
}
