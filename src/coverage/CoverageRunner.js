// CoverageRunner: wraps maineffect.web.js + istanbul for browser execution
// Port of lab's runner.js for in-browser use
//
// maineffect.web.js is loaded as a <script> tag and sets window.maineffect
// babel-plugin-istanbul is imported via Vite bundler

import istanbul from 'babel-plugin-istanbul';

const ExportRemover = () => () => {
  return {
    visitor: {
      ExportDefaultDeclaration(path) {
        path.replaceWith(path.node.declaration);
      },
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          path.replaceWith(path.node.declaration);
        }
      },
    },
  };
};

const istanbulConfig = {
  cwd: '/',
  include: ['**/fake.js'],
  exclude: [],
  extension: ['.js'],
};

function getParseFnStr() {
  // maineffect.web.js loaded as script tag → window.maineffect
  const me = window.maineffect;
  if (me && me.parseFnStr) return me.parseFnStr;
  if (me && me.default && me.default.parseFnStr) return me.default.parseFnStr;
  return null;
}

export default class CoverageRunner {
  constructor() {
    this.ready = !!istanbul && !!getParseFnStr();
  }

  async execute(sourceCode, fnName, stubs = {}, params = []) {
    // Clear previous coverage
    window.__coverage__ = {};

    const parseFnStr = getParseFnStr();
    if (!istanbul || !parseFnStr) {
      console.warn('Istanbul or maineffect not available');
      return { result: null, coverageData: null, error: new Error('Dependencies not loaded') };
    }

    try {
      // Extract function parameter names from source to build callWith args
      const paramNames = this.extractParamNames(sourceCode, fnName);
      const callArgs = paramNames.map(p => stubs[p] !== undefined ? stubs[p] : undefined);

      const parsedFn = parseFnStr(
        '/fake.js',
        sourceCode,
        {
          process: { env: {} },
          URL: globalThis.URL,
          setTimeout: globalThis.setTimeout,
          clearInterval: globalThis.clearInterval,
          setInterval: globalThis.setInterval,
          console: globalThis.console,
          Math: globalThis.Math,
          Error: globalThis.Error,
        },
        {
          plugins: [
            ExportRemover(),
            [istanbul, istanbulConfig],
          ],
        }
      );

      if (fnName && fnName !== '__module__') {
        const foundFn = parsedFn.find(fnName);

        // Provide external dependencies (non-parameter stubs)
        const externalStubs = {};
        for (const [key, value] of Object.entries(stubs)) {
          if (!paramNames.includes(key)) {
            externalStubs[key] = value;
          }
        }
        if (Object.keys(externalStubs).length > 0) {
          foundFn.provide(externalStubs);
        }

        try {
          const result = await foundFn.callWith(...callArgs);
          const coverageData = this._extractCoverage();
          return { result, coverageData, error: null };
        } catch (e) {
          const coverageData = this._extractCoverage();
          return { result: null, coverageData, error: e };
        }
      } else {
        const coverageData = this._extractCoverage();
        return { result: null, coverageData, error: null };
      }
    } catch (e) {
      console.error('CoverageRunner execute error:', e);
      return { result: null, coverageData: null, error: e };
    }
  }

  extractParamNames(sourceCode, fnName) {
    try {
      // Simple regex to extract parameter names from function declaration
      const regex = new RegExp(`function\\s+${fnName}\\s*\\(([^)]*)\\)`);
      const match = sourceCode.match(regex);
      if (match && match[1]) {
        return match[1].split(',').map(p => p.trim()).filter(Boolean);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  _extractCoverage() {
    const cov = window.__coverage__;
    if (!cov) return null;

    const files = Object.keys(cov);
    if (files.length === 0) return null;

    const fileCov = cov[files[0]];
    return {
      statementMap: fileCov.statementMap,
      branchMap: fileCov.branchMap,
      fnMap: fileCov.fnMap,
      s: fileCov.s,
      b: fileCov.b,
      f: fileCov.f,
    };
  }
}
