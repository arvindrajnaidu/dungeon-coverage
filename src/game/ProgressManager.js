const STORAGE_KEY = 'dungeon-coverage-save';

export default class ProgressManager {
  constructor() {
    this.data = this._load();
  }

  _getDefaultData() {
    return {
      unlockedLevels: 1,
      levels: {}, // levelIndex -> { completed, bestScore, tests }
    };
  }

  _load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new fields
        return { ...this._getDefaultData(), ...parsed };
      }
    } catch (e) {
      console.warn('[ProgressManager] Failed to load progress:', e);
    }
    return this._getDefaultData();
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[ProgressManager] Failed to save progress:', e);
    }
  }

  // --- Unlocked Levels ---

  getUnlockedLevels() {
    // TODO: Re-enable level locking later
    // return this.data.unlockedLevels;
    return 99; // All levels unlocked for now
  }

  unlockLevel(levelIndex) {
    // levelIndex is 0-based, unlockedLevels is count (1-based)
    const unlockCount = levelIndex + 1;
    if (unlockCount > this.data.unlockedLevels) {
      this.data.unlockedLevels = unlockCount;
      this._save();
    }
  }

  // --- Per-Level Progress ---

  getLevelProgress(levelIndex) {
    return this.data.levels[levelIndex] || null;
  }

  // Get all saved tests for a level (the test file)
  getLevelTests(levelIndex) {
    const progress = this.data.levels[levelIndex];
    // Migrate from old testRuns format if needed
    return progress?.tests || progress?.testRuns || [];
  }

  // Add a new test case to the level's test file
  addTest(levelIndex, test) {
    if (!this.data.levels[levelIndex]) {
      this.data.levels[levelIndex] = { tests: [] };
    }
    if (!this.data.levels[levelIndex].tests) {
      this.data.levels[levelIndex].tests = [];
    }
    this.data.levels[levelIndex].tests.push({
      description: test.description,
      inputs: test.inputs,
      timestamp: Date.now(),
    });
    this._save();
    console.log('[ProgressManager] Saved test:', test.description);
  }

  // Mark level as completed and update stats
  markLevelCompleted(levelIndex, score) {
    if (!this.data.levels[levelIndex]) {
      this.data.levels[levelIndex] = { tests: [] };
    }
    const existing = this.data.levels[levelIndex];
    existing.completed = true;
    existing.bestScore = Math.max(existing.bestScore || 0, score);
    existing.lastPlayed = Date.now();

    // Unlock next level
    this.unlockLevel(levelIndex + 2);

    this._save();
  }

  isLevelCompleted(levelIndex) {
    const progress = this.data.levels[levelIndex];
    return progress?.completed || false;
  }

  // --- Reset ---

  resetAll() {
    this.data = this._getDefaultData();
    this._save();
  }

  resetLevel(levelIndex) {
    delete this.data.levels[levelIndex];
    this._save();
  }

  // Clear only the tests for a level (keeps completed status)
  clearLevelTests(levelIndex) {
    if (this.data.levels[levelIndex]) {
      this.data.levels[levelIndex].tests = [];
      // Also clear old format if present
      delete this.data.levels[levelIndex].testRuns;
      this._save();
      console.log('[ProgressManager] Cleared tests for level', levelIndex);
    }
  }
}
