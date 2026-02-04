import GameApp from './engine/GameApp.js';
import SpriteManager from './engine/SpriteManager.js';
import SceneManager from './scenes/SceneManager.js';
import TitleScene from './scenes/TitleScene.js';
import LevelScene from './scenes/LevelScene.js';
import ResultScene from './scenes/ResultScene.js';
import VictoryScene from './scenes/VictoryScene.js';

async function init() {
  const container = document.getElementById('game-container');
  const loading = document.getElementById('loading');

  try {
    // Create game app
    const gameApp = new GameApp(container);

    // Load sprites (use the main app's renderer for texture generation)
    const spriteManager = new SpriteManager();
    await spriteManager.load(gameApp.renderer);

    // Create scene manager
    const sceneManager = new SceneManager(gameApp);

    // Register scenes
    const titleScene = new TitleScene(sceneManager);
    const levelScene = new LevelScene(sceneManager, spriteManager);
    const resultScene = new ResultScene(sceneManager);
    const victoryScene = new VictoryScene(sceneManager);

    sceneManager.register('title', titleScene);
    sceneManager.register('level', levelScene);
    sceneManager.register('result', resultScene);
    sceneManager.register('victory', victoryScene);

    // Game loop
    gameApp.onUpdate((delta) => {
      sceneManager.update(delta);
    });

    // Expose for debugging
    window.__sceneManager = sceneManager;
    window.__gameApp = gameApp;

    // Remove loading indicator
    if (loading) loading.style.display = 'none';

    // Start at title screen
    await sceneManager.switchTo('title');
  } catch (e) {
    console.error('Failed to initialize game:', e);
    if (loading) loading.textContent = `Error: ${e.message}`;
  }
}

init();
