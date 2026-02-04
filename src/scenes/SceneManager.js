export default class SceneManager {
  constructor(gameApp) {
    this.gameApp = gameApp;
    this.currentScene = null;
    this.scenes = {};
  }

  register(name, scene) {
    this.scenes[name] = scene;
  }

  async switchTo(name, data = {}) {
    if (this.currentScene) {
      this.currentScene.exit();
      this.gameApp.removeChild(this.currentScene.getContainer());
    }

    const scene = this.scenes[name];
    if (!scene) {
      console.error(`Scene "${name}" not found`);
      return;
    }

    this.currentScene = scene;
    this.gameApp.addChild(scene.getContainer());
    await scene.enter(data);
  }

  update(delta) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(delta);
    }
  }
}
