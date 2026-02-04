import { PHASES } from '../constants.js';

export default class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = PHASES.SETUP;
    this.currentLevel = 0;
    this.runNumber = 0;
    this.stubs = {};
    this.collectedGems = new Set();
    this.allCollectedGems = new Set(); // across all runs
    this.coverageData = null;
    this.aggregatedCoverage = null;
    this.score = 0;
    this.totalGems = 0;
    this.totalStatements = 0;
    this.coveredStatements = 0;
    this.coveragePercent = 0;
    this.branchCoveragePercent = 0;
  }

  startNewRun() {
    this.runNumber++;
    this.phase = PHASES.SETUP;
    this.stubs = {};
    this.collectedGems = new Set();
    this.coverageData = null;
  }

  setPhase(phase) {
    this.phase = phase;
  }

  collectGem(gemId) {
    this.collectedGems.add(gemId);
    this.allCollectedGems.add(gemId);
  }

  setCoverage(coverageData) {
    this.coverageData = coverageData;
  }

  updateCoverageStats(statementPct, branchPct, coveredCount, totalCount) {
    this.coveragePercent = statementPct;
    this.branchCoveragePercent = branchPct;
    this.coveredStatements = coveredCount;
    this.totalStatements = totalCount;
    this.score = Math.round(statementPct + branchPct);
  }

  isFullCoverage() {
    return this.coveragePercent >= 100 && this.branchCoveragePercent >= 100;
  }
}
