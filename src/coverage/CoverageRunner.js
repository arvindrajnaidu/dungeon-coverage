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

function getMaineffect() {
  // maineffect.web.js loaded as script tag → window.maineffect
  const me = window.maineffect;
  if (me && me.parseFnStr) return me;
  if (me && me.default && me.default.parseFnStr) return me.default;
  return null;
}

function getParseFnStr() {
  const me = getMaineffect();
  return me ? me.parseFnStr : null;
}

function getStubs() {
  const me = getMaineffect();
  return me ? me.Stubs : null;
}

// Simple mock function factory to replace jest.fn in browser
function createMockFn() {
  const calls = [];
  const fn = function(...args) {
    calls.push(args);
    return fn._returnValue;
  };
  fn.calls = calls;
  fn._returnValue = undefined;
  fn._configuredValue = undefined;
  fn.mockReturnValue = (val) => { fn._returnValue = val; fn._configuredValue = val; return fn; };
  fn.mockResolvedValue = (val) => { fn._returnValue = Promise.resolve(val); fn._configuredValue = val; return fn; };
  fn.mockRejectedValue = (val) => { fn._returnValue = Promise.reject(val); fn._configuredValue = val; return fn; };
  return fn;
}

export default class CoverageRunner {
  constructor() {
    this.ready = !!istanbul && !!getParseFnStr();
  }

  async execute(sourceCode, fnName, stubs = {}, options = {}) {
    const { quiet = false } = options;

    // Clear previous coverage
    window.__coverage__ = {};

    // Track stubs instance for later dumping
    let stubsInstance = null;

    const parseFnStr = getParseFnStr();
    if (!istanbul || !parseFnStr) {
      console.warn('Istanbul or maineffect not available');
      return { result: null, coverageData: null, error: new Error('Dependencies not loaded'), stubDump: null };
    }

    // Log what we're about to execute (unless quiet mode)
    if (!quiet) {
      console.log('%c=== EXECUTING TEST ===', 'color: #44ff44; font-weight: bold; font-size: 14px;');
      console.log('%cFunction:', 'color: #ffaa44; font-weight: bold;', fnName);
      console.log('%cSource Code:', 'color: #ffaa44; font-weight: bold;');
      console.log(sourceCode);
      console.log('%cInputs/Stubs:', 'color: #ffaa44; font-weight: bold;');
      for (const [key, value] of Object.entries(stubs)) {
        if (typeof value === 'function') {
          try {
            const testResult = value();
            console.log(`  ${key}: [stub function] returns:`, testResult);
          } catch (e) {
            console.log(`  ${key}: [stub function] (async or throws)`);
          }
        } else {
          console.log(`  ${key}:`, value);
        }
      }
    }

    try {
      // Extract function parameter names from source to build callWith args
      const paramNames = this.extractParamNames(sourceCode, fnName);

      // Create maineffect Stubs instance if we have stub parameters
      const StubsFactory = getStubs();
      if (StubsFactory) {
        stubsInstance = StubsFactory(createMockFn);
        if (!quiet) console.log('%cUsing maineffect Stubs:', 'color: #66ffcc;', !!stubsInstance);
      }

      // Convert stub objects to actual callable stubs using maineffect's Stubs API
      const callArgs = paramNames.map(p => {
        const value = stubs[p];
        if (value && value.__stub) {
          const returnValue = value.returns;
          if (!quiet) console.log(`%c  Creating stub for ${p}, returns:`, 'color: #66ffcc;', returnValue);

          if (stubsInstance) {
            // Use maineffect's Stubs API
            const stub = stubsInstance.createStub(p);
            if (returnValue !== undefined) {
              stub.mockResolvedValue(returnValue);
            } else {
              stub.mockResolvedValue(undefined);
            }
            if (!quiet) {
              console.log(`%c  Created maineffect stub for ${p}:`, 'color: #66ffcc;');
              console.log(`%c    Type:`, 'color: #66ffcc;', typeof stub);
              console.log(`%c    Is function:`, 'color: #66ffcc;', typeof stub === 'function');
            }
            return stub;
          } else {
            // Fallback: create simple mock function
            const mockFn = createMockFn();
            mockFn.mockResolvedValue(returnValue);
            if (!quiet) {
              console.log(`%c  Created fallback mock for ${p}:`, 'color: #ffcc66;');
              console.log(`%c    Type:`, 'color: #ffcc66;', typeof mockFn);
            }
            return mockFn;
          }
        }
        return value;
      });

      if (!quiet) {
        console.log('%cParameter names:', 'color: #88aaff;', paramNames);
        console.log('%cCall arguments:', 'color: #88aaff;', callArgs);
      }

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
          if (!quiet) console.log('%cExternal stubs provided:', 'color: #88aaff;', Object.keys(externalStubs));
          foundFn.provide(externalStubs);
        }

        if (!quiet) console.log('%c--- Running function ---', 'color: #aaaaaa;');

        try {
          const result = await foundFn.callWith(...callArgs);
          const coverageData = this._extractCoverage();

          // Debug: log raw result to understand maineffect's output format
          if (!quiet) {
            console.log('%c--- Raw result from maineffect ---', 'color: #88aaff;');
            console.log('%cType:', 'color: #88aaff;', typeof result);
            console.log('%cValue:', 'color: #88aaff;', result);
            if (result && typeof result === 'object') {
              console.log('%cKeys:', 'color: #88aaff;', Object.keys(result));
            }
          }

          // Capture stub states from maineffect Stubs
          const getStubDump = () => {
            if (!stubsInstance || typeof stubsInstance.getStubs !== 'function') return null;
            const allStubs = stubsInstance.getStubs();
            const dump = {};
            for (const [name, stub] of Object.entries(allStubs)) {
              dump[name] = {
                callCount: stub.calls ? stub.calls.length : 0,
                calls: stub.calls || [],
                returnValue: stub._configuredValue,
              };
            }
            return Object.keys(dump).length > 0 ? dump : null;
          };

          // Check if maineffect returned an Error instance
          if (result instanceof Error) {
            if (!quiet) {
              console.log('%c--- Function returned Error ---', 'color: #ff4444;');
              console.error('%cError:', 'color: #ff4444; font-weight: bold;', result);
              console.log('%c=== END TEST (with error) ===', 'color: #ff4444; font-weight: bold;');
            }
            return { result: null, coverageData, error: result, stubDump: getStubDump() };
          }

          // Check if result has an error property (maineffect might wrap errors)
          if (result && typeof result === 'object' && result.error) {
            if (!quiet) {
              console.log('%c--- Function returned error object ---', 'color: #ff4444;');
              console.error('%cError:', 'color: #ff4444; font-weight: bold;', result.error);
              console.log('%c=== END TEST (with error) ===', 'color: #ff4444; font-weight: bold;');
            }
            return { result: null, coverageData, error: result.error, stubDump: getStubDump() };
          }

          // Check if result is an Error-like object (has message and stack properties)
          if (result && typeof result === 'object' && result.message && result.stack) {
            if (!quiet) {
              console.log('%c--- Function returned Error-like object ---', 'color: #ff4444;');
              console.error('%cError:', 'color: #ff4444; font-weight: bold;', result.message);
              console.log('%c=== END TEST (with error) ===', 'color: #ff4444; font-weight: bold;');
            }
            const err = new Error(result.message);
            err.stack = result.stack;
            return { result: null, coverageData, error: err, stubDump: getStubDump() };
          }

          // Check if result has an exception property (maineffect's getFn pattern)
          if (result && typeof result === 'object' && result.exception) {
            if (!quiet) {
              console.log('%c--- Function returned exception (maineffect pattern) ---', 'color: #ff4444;');
              console.error('%cException:', 'color: #ff4444; font-weight: bold;', result.exception);
              console.log('%c=== END TEST (with error) ===', 'color: #ff4444; font-weight: bold;');
            }
            return { result: null, coverageData, error: result.exception, stubDump: getStubDump() };
          }

          // Check if result has a __error property (another possible pattern)
          if (result && typeof result === 'object' && result.__error) {
            if (!quiet) {
              console.log('%c--- Function returned __error ---', 'color: #ff4444;');
              console.error('%cError:', 'color: #ff4444; font-weight: bold;', result.__error);
              console.log('%c=== END TEST (with error) ===', 'color: #ff4444; font-weight: bold;');
            }
            return { result: null, coverageData, error: result.__error, stubDump: getStubDump() };
          }

          // Capture stub states from maineffect Stubs
          const stubDump = getStubDump();

          if (!quiet) {
            console.log('%c--- Function completed ---', 'color: #44ff44;');
            console.log('%cResult:', 'color: #44ff44; font-weight: bold;', result);
            if (stubDump) {
              console.log('%cStub states:', 'color: #66ffcc; font-weight: bold;', stubDump);
            }
            console.log('%c=== END TEST ===', 'color: #44ff44; font-weight: bold;');
          }

          return { result, coverageData, error: null, stubDump };
        } catch (e) {
          const coverageData = this._extractCoverage();
          const stubDump = getStubDump();

          if (!quiet) {
            console.log('%c--- Function threw error ---', 'color: #ff4444;');
            console.error('%cError:', 'color: #ff4444; font-weight: bold;', e);
            console.log('%cError message:', 'color: #ff4444;', e.message);
            console.log('%cError stack:', 'color: #ff4444;', e.stack);
            console.log('%c=== END TEST (with error) ===', 'color: #ff4444; font-weight: bold;');
          }

          return { result: null, coverageData, error: e, stubDump };
        }
      } else {
        const coverageData = this._extractCoverage();
        if (!quiet) console.log('%c=== END TEST ===', 'color: #44ff44; font-weight: bold;');
        return { result: null, coverageData, error: null, stubDump: null };
      }
    } catch (e) {
      console.error('%c=== EXECUTION FAILED ===', 'color: #ff4444; font-weight: bold; font-size: 14px;');
      console.error('%cError during setup:', 'color: #ff4444; font-weight: bold;', e);
      console.error('%cStack:', 'color: #ff4444;', e.stack);
      return { result: null, coverageData: null, error: e, stubDump: null };
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
