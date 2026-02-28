import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, COLORS } from '../constants.js';
import Button from '../ui/Button.js';
import levels from '../levels/index.js';

export default class TitleScene {
  constructor(sceneManager, soundManager = null, progressManager = null, weaponInventory = null, crystalInventory = null) {
    this.sceneManager = sceneManager;
    this.soundManager = soundManager;
    this.progressManager = progressManager;
    this.weaponInventory = weaponInventory;
    this.crystalInventory = crystalInventory;
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

    // Subtitle with link
    const prefix = 'A Javascript unit testing game powered by ';
    const linkText = 'maineffectjs';
    const subtitleText = new PIXI.Text(prefix, {
      fontFamily: 'monospace', fontSize: 13, fill: 0xaaaacc,
    });
    const subtitleLink = new PIXI.Text(linkText, {
      fontFamily: 'monospace', fontSize: 13, fill: 0x4488cc,
    });
    const totalWidth = subtitleText.width + subtitleLink.width;
    subtitleText.x = (screenW - totalWidth) / 2;
    subtitleText.y = 163;
    this.container.addChild(subtitleText);

    subtitleLink.x = subtitleText.x + subtitleText.width;
    subtitleLink.y = 163;
    subtitleLink.eventMode = 'static';
    subtitleLink.cursor = 'pointer';
    subtitleLink.on('pointerover', () => { subtitleLink.style.fill = 0x66bbff; });
    subtitleLink.on('pointerout', () => { subtitleLink.style.fill = 0x4488cc; });
    subtitleLink.on('pointertap', () => {
      window.open('https://github.com/arvindrajnaidu/maineffect', '_blank');
    });
    this.container.addChild(subtitleLink);

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

    // Bottom buttons
    const btnGap = 12;
    const resetBtn = new Button('Reset Progress', 140, 28, this.soundManager);
    const aboutBtn = new Button('About', 80, 28, this.soundManager);
    const totalBtnWidth = 140 + btnGap + 80;
    const btnStartX = (screenW - totalBtnWidth) / 2;

    resetBtn.x = btnStartX;
    resetBtn.y = screenH - 24;
    resetBtn.onClick(() => {
      this._showResetConfirmation(screenW, screenH);
    });
    this.container.addChild(resetBtn);

    aboutBtn.x = btnStartX + 140 + btnGap;
    aboutBtn.y = screenH - 24;
    aboutBtn.onClick(() => {
      this._showAbout(screenW, screenH);
    });
    this.container.addChild(aboutBtn);
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

    const descText = new PIXI.Text('This will erase all saved progress\nand test runs. Weapons and crystals\nwill be kept.', {
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
    // Clear all game-related localStorage keys EXCEPT weapons and crystals
    const keysToRemove = [];
    const keysToKeep = ['dungeon-coverage-weapons', 'dungeon-coverage-crystals'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('dungeon-coverage') || key.startsWith('dc-'))) {
        // Keep weapons and crystals - only reset level progress
        if (!keysToKeep.includes(key)) {
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

  _showAbout(screenW, screenH) {
    const overlay = new PIXI.Container();

    const dimBg = new PIXI.Graphics();
    dimBg.beginFill(0x000000, 0.85);
    dimBg.drawRect(0, 0, screenW, screenH);
    dimBg.endFill();
    dimBg.eventMode = 'static';
    overlay.addChild(dimBg);

    const panelW = 400;
    const panelH = 240;
    const panel = new PIXI.Graphics();
    panel.beginFill(0x1a1a3e);
    panel.lineStyle(2, 0x4488cc);
    panel.drawRoundedRect((screenW - panelW) / 2, (screenH - panelH) / 2, panelW, panelH, 8);
    panel.endFill();
    overlay.addChild(panel);

    const titleText = new PIXI.Text('About', {
      fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', fill: 0x44aaff, align: 'center',
    });
    titleText.anchor.set(0.5);
    titleText.x = screenW / 2;
    titleText.y = screenH / 2 - 85;
    overlay.addChild(titleText);

    const credits = [
      { text: 'Dungeon Tileset II v1.7', color: 0xeeddaa },
      { text: 'by 0x72', color: 0xaaaacc },
      { text: '' },
      { text: 'Sound Effects Collection (CC0)', color: 0xeeddaa },
      { text: 'by Juhani Junkala', color: 0xaaaacc },
      { text: '' },
      { text: 'Built with PIXI.js and Howler.js', color: 0x888899 },
    ];

    let cy = screenH / 2 - 55;
    for (const line of credits) {
      if (!line.text) { cy += 8; continue; }
      const t = new PIXI.Text(line.text, {
        fontFamily: 'monospace', fontSize: 12, fill: line.color || 0xaaaacc, align: 'center',
      });
      t.anchor.set(0.5);
      t.x = screenW / 2;
      t.y = cy;
      overlay.addChild(t);
      cy += 18;
    }

    const closeBtn = new Button('Close', 80, 28, this.soundManager);
    closeBtn.x = (screenW - 80) / 2;
    closeBtn.y = screenH / 2 + panelH / 2 - 45;
    closeBtn.onClick(() => {
      this.container.removeChild(overlay);
    });
    overlay.addChild(closeBtn);

    this.container.addChild(overlay);
  }

  exit() {}

  update() {}

  getContainer() {
    return this.container;
  }
}
