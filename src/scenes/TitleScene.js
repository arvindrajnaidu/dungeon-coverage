import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS } from '../constants.js';
import Button from '../ui/Button.js';
import levels from '../levels/index.js';

export default class TitleScene {
  constructor(sceneManager, soundManager = null, progressManager = null, weaponInventory = null) {
    this.sceneManager = sceneManager;
    this.soundManager = soundManager;
    this.progressManager = progressManager;
    this.weaponInventory = weaponInventory;
    this.container = new PIXI.Container();
  }

  async enter(data = {}) {
    this.container.removeChildren();

    // Get screen dimensions from game app
    const gameApp = this.sceneManager.gameApp;
    const screenW = gameApp.getScreenWidth();
    const screenH = gameApp.getScreenHeight();
    const isMobile = screenW < 600;

    // Get unlocked levels from progress manager
    const unlockedLevels = this.progressManager?.getUnlockedLevels() || 1;

    // Background - fill entire screen
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a2e);
    bg.drawRect(0, 0, screenW, screenH);
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
    title.x = screenW / 2;
    title.y = 100;
    this.container.addChild(title);

    // Subtitle
    const subtitle = new PIXI.Text('The Javascript unit testing game.', {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xaaaacc,
      align: 'center',
    });
    subtitle.anchor.set(0.5);
    subtitle.x = screenW / 2;
    subtitle.y = 170;
    this.container.addChild(subtitle);

    // Mobile warning
    if (isMobile) {
      const mobileWarning = new PIXI.Text('Best played on desktop', {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xffaa44,
        align: 'center',
      });
      mobileWarning.anchor.set(0.5);
      mobileWarning.x = screenW / 2;
      mobileWarning.y = 175;
      this.container.addChild(mobileWarning);
    }

    // Level buttons
    const startY = 200;
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const isUnlocked = i < unlockedLevels;
      const isCompleted = this.progressManager?.isLevelCompleted(i) || false;
      const progress = this.progressManager?.getLevelProgress(i);

      // Build label
      let label = `${i + 1}. ${level.name}`;
      if (!isUnlocked) {
        label += ' [LOCKED]';
      } else if (isCompleted) {
        label += ' ✓';
      } else if (progress?.statementCoverage > 0) {
        label += ` (${Math.round(progress.statementCoverage)}%)`;
      }

      const btn = new Button(label, 320, 36, this.soundManager);
      btn.x = (screenW - 320) / 2;
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
    instructions.x = screenW / 2;
    instructions.y = screenH - 50;
    this.container.addChild(instructions);

    // Reset button
    const resetBtn = new Button('Reset Progress', 140, 28, this.soundManager);
    resetBtn.x = (screenW - 140) / 2;
    resetBtn.y = screenH - 24;
    resetBtn.onClick(() => {
      this._showResetConfirmation(screenW, screenH);
    });
    this.container.addChild(resetBtn);
  }

  _showResetConfirmation(screenW, screenH) {
    // Create confirmation overlay
    const overlay = new PIXI.Container();

    // Dim background
    const dimBg = new PIXI.Graphics();
    dimBg.beginFill(0x000000, 0.8);
    dimBg.drawRect(0, 0, screenW, screenH);
    dimBg.endFill();
    dimBg.eventMode = 'static';
    overlay.addChild(dimBg);

    // Dialog panel
    const panelW = 360;
    const panelH = 160;
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1a1a3e);
    panel.lineStyle(2, 0xff6644);
    panel.drawRoundedRect((screenW - panelW) / 2, (screenH - panelH) / 2, panelW, panelH, 8);
    panel.endFill();
    overlay.addChild(panel);

    // Warning text
    const warningText = new PIXI.Text('Reset All Progress?', {
      fontFamily: 'monospace',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xff6644,
      align: 'center',
    });
    warningText.anchor.set(0.5);
    warningText.x = screenW / 2;
    warningText.y = screenH / 2 - 40;
    overlay.addChild(warningText);

    const descText = new PIXI.Text('This will erase all saved progress,\ntest runs, and forged weapons.', {
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xaaaacc,
      align: 'center',
    });
    descText.anchor.set(0.5);
    descText.x = screenW / 2;
    descText.y = screenH / 2 - 5;
    overlay.addChild(descText);

    // Confirm button
    const confirmBtn = new Button('Yes, Reset', 100, 32, this.soundManager);
    confirmBtn.x = screenW / 2 - 110;
    confirmBtn.y = screenH / 2 + 35;
    confirmBtn.onClick(() => {
      this._resetAllData();
      this.container.removeChild(overlay);
      // Re-enter the scene to refresh
      this.enter({});
    });
    overlay.addChild(confirmBtn);

    // Cancel button
    const cancelBtn = new Button('Cancel', 100, 32, this.soundManager);
    cancelBtn.x = screenW / 2 + 10;
    cancelBtn.y = screenH / 2 + 35;
    cancelBtn.onClick(() => {
      this.container.removeChild(overlay);
    });
    overlay.addChild(cancelBtn);

    this.container.addChild(overlay);
  }

  _resetAllData() {
    // Clear all game-related localStorage keys EXCEPT weapons
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('dungeon-coverage') || key.startsWith('dc-'))) {
        // Keep weapons - only reset level progress
        if (key !== 'dungeon-coverage-weapons') {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Reset progress manager (level progress only)
    if (this.progressManager) {
      this.progressManager.resetAll();
    }

    // Play sound
    if (this.soundManager) {
      this.soundManager.play('sceneTransition');
    }
  }

  exit() {}

  update() {}

  getContainer() {
    return this.container;
  }
}
