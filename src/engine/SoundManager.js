import { Howl, Howler } from 'howler';

const STORAGE_KEY = 'dungeon-coverage-muted';

// Sound file paths - using existing Effects library
const SOUNDS = {
  footstep: '/sounds/Effects/Movement/Footsteps/sfx_movement_footsteps1a.wav',
  gemCollect: '/sounds/Effects/General Sounds/Coins/sfx_coin_single1.wav',
  buttonHover: '/sounds/Effects/General Sounds/Menu Sounds/sfx_menu_move1.wav',
  buttonClick: '/sounds/Effects/General Sounds/Buttons/sfx_sounds_button1.wav',
  forgeCreate: '/sounds/Effects/General Sounds/Positive Sounds/sfx_sounds_powerup1.wav',
  weaponDrop: '/sounds/Effects/General Sounds/Interactions/sfx_sounds_interaction5.wav',
  runStart: '/sounds/Effects/General Sounds/Positive Sounds/sfx_sounds_powerup4.wav',
  levelComplete: '/sounds/Effects/General Sounds/Fanfares/sfx_sounds_fanfare1.wav',
  victory: '/sounds/Effects/General Sounds/Fanfares/sfx_sounds_fanfare3.wav',
  sceneTransition: '/sounds/Effects/Movement/Portals and Transitions/sfx_movement_portal1.wav',
  error: '/sounds/Effects/General Sounds/Negative Sounds/sfx_sounds_error1.wav',
};

export default class SoundManager {
  constructor() {
    this.sounds = {};
    this.loaded = false;
    this._muted = false;
    this._masterVolume = 0.7;
    this._loadMuteState();
  }

  async load() {
    const loadPromises = [];

    for (const [key, path] of Object.entries(SOUNDS)) {
      loadPromises.push(this._loadSound(key, path));
    }

    await Promise.all(loadPromises);

    // Apply initial mute state
    Howler.mute(this._muted);
    Howler.volume(this._masterVolume);

    this.loaded = true;
  }

  _loadSound(key, path) {
    return new Promise((resolve) => {
      const sound = new Howl({
        src: [path],
        volume: this._getVolumeForKey(key),
        onload: () => resolve(),
        onloaderror: (id, err) => {
          console.warn(`Failed to load sound ${key}: ${err}`);
          resolve(); // Don't block on missing sounds
        },
      });
      this.sounds[key] = sound;
    });
  }

  _getVolumeForKey(key) {
    // Adjust volume levels for different sounds
    switch (key) {
      case 'footstep':
        return 0.3;
      case 'buttonHover':
        return 0.2;
      case 'buttonClick':
        return 0.4;
      case 'gemCollect':
        return 0.5;
      case 'victory':
      case 'levelComplete':
        return 0.6;
      default:
        return 0.5;
    }
  }

  play(soundKey, opts = {}) {
    const sound = this.sounds[soundKey];
    if (!sound) {
      console.warn(`Sound "${soundKey}" not found`);
      return null;
    }

    // Apply pitch variation if specified
    if (opts.rate) {
      sound.rate(opts.rate);
    }

    const id = sound.play();
    return id;
  }

  stop(soundKey) {
    const sound = this.sounds[soundKey];
    if (sound) {
      sound.stop();
    }
  }

  stopAll() {
    Howler.stop();
  }

  setMuted(muted) {
    this._muted = muted;
    Howler.mute(muted);
    this._saveMuteState();
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }

  setMasterVolume(vol) {
    this._masterVolume = Math.max(0, Math.min(1, vol));
    Howler.volume(this._masterVolume);
  }

  getMasterVolume() {
    return this._masterVolume;
  }

  // Convenience method: footstep with pitch variation
  playFootstep() {
    const rate = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
    this.play('footstep', { rate });
  }

  // Convenience method: gem collect with pitch variation
  playGemCollect() {
    const rate = 0.95 + Math.random() * 0.1; // 0.95 to 1.05
    this.play('gemCollect', { rate });
  }

  _loadMuteState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this._muted = stored === 'true';
      }
    } catch (e) {
      // localStorage not available
    }
  }

  _saveMuteState() {
    try {
      localStorage.setItem(STORAGE_KEY, String(this._muted));
    } catch (e) {
      // localStorage not available
    }
  }
}
