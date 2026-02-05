// CoverageTracker: aggregates coverage across multiple runs

export default class CoverageTracker {
  constructor() {
    this.aggregated = null;
    this.runs = [];
  }

  reset() {
    this.aggregated = null;
    this.runs = [];
  }

  addRun(coverageData) {
    if (!coverageData) return;
    this.runs.push(coverageData);

    if (!this.aggregated) {
      this.aggregated = JSON.parse(JSON.stringify(coverageData));
      return;
    }

    // Merge statement coverage: max of hit counts
    if (coverageData.s) {
      for (const id of Object.keys(coverageData.s)) {
        this.aggregated.s[id] = Math.max(
          this.aggregated.s[id] || 0,
          coverageData.s[id]
        );
      }
    }

    // Merge branch coverage: max of hit counts per branch arm
    if (coverageData.b) {
      for (const id of Object.keys(coverageData.b)) {
        if (!this.aggregated.b[id]) {
          this.aggregated.b[id] = [...coverageData.b[id]];
        } else {
          for (let i = 0; i < coverageData.b[id].length; i++) {
            this.aggregated.b[id][i] = Math.max(
              this.aggregated.b[id][i] || 0,
              coverageData.b[id][i]
            );
          }
        }
      }
    }

    // Merge function coverage
    if (coverageData.f) {
      for (const id of Object.keys(coverageData.f)) {
        this.aggregated.f[id] = Math.max(
          this.aggregated.f[id] || 0,
          coverageData.f[id]
        );
      }
    }
  }

  getStatementCoverage() {
    if (!this.aggregated || !this.aggregated.s) return { covered: 0, total: 0, percent: 0 };
    const total = Object.keys(this.aggregated.s).length;
    const covered = Object.values(this.aggregated.s).filter(v => v > 0).length;
    return { covered, total, percent: total > 0 ? (covered / total) * 100 : 0 };
  }

  getBranchCoverage() {
    if (!this.aggregated || !this.aggregated.b) return { covered: 0, total: 0, percent: 0 };
    let total = 0;
    let covered = 0;
    for (const arms of Object.values(this.aggregated.b)) {
      for (const count of arms) {
        total++;
        if (count > 0) covered++;
      }
    }
    return { covered, total, percent: total > 0 ? (covered / total) * 100 : 0 };
  }

  getCoveredStatementIds() {
    if (!this.aggregated || !this.aggregated.s) return new Set();
    const covered = new Set();
    for (const [id, count] of Object.entries(this.aggregated.s)) {
      if (count > 0) covered.add(id);
    }
    return covered;
  }

  getAggregatedCoverage() {
    return this.aggregated;
  }

  isFullCoverage() {
    const stmt = this.getStatementCoverage();
    const branch = this.getBranchCoverage();
    return stmt.percent >= 100 && (branch.total === 0 || branch.percent >= 100);
  }

  getRunCount() {
    return this.runs.length;
  }
}
