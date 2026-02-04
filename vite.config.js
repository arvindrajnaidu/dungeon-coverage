import { defineConfig } from 'vite';
import path from 'path';

// Plugin to inject process polyfill for istanbul
function processPolyfill() {
  return {
    name: 'process-polyfill',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: `
            window.process = {
              cwd: function() { return '/'; },
              env: {
                NYC_CWD: '/',
                NYC_CONFIG: ${JSON.stringify(JSON.stringify({
                  cwd: '/',
                  include: ['fake.js'],
                  exclude: ['**/*/spec.js'],
                  extension: ['.js'],
                }))},
                IS_WEB: 'true',
                NODE_ENV: 'development',
              },
            };
          `,
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// Redirect @babel/core and @babel/traverse imports to window globals
function babelExternals() {
  return {
    name: 'babel-externals',
    enforce: 'pre',
    resolveId(source) {
      if (source === '@babel/core') return '\0virtual:babel-core';
      if (source === '@babel/traverse') return '\0virtual:babel-traverse';
      return null;
    },
    load(id) {
      if (id === '\0virtual:babel-core') {
        return `
          var bc = window["@babel/core"] || window.Babel;
          function unwrap(mod) { return mod && (mod.__esModule || (typeof mod === 'object' && mod.default)) ? mod.default : mod; }
          var pkgs = bc.packages || {};
          export var transform = bc.transform;
          export var transformSync = bc.transform;
          export var transformFromAstSync = bc.transformFromAst || bc.transformFromAstSync;
          export var transformFromAst = bc.transformFromAst;
          export var transformFileSync = function() { throw new Error("Not available in browser"); };
          export var types = unwrap(pkgs.types) || bc.types;
          export var template = unwrap(pkgs.template);
          export var traverse = unwrap(pkgs.traverse);
          export var parse = bc.parse || function(code, opts) {
            return bc.transform(code, Object.assign({}, opts, { ast: true, code: false })).ast;
          };
          export default bc;
        `;
      }
      if (id === '\0virtual:babel-traverse') {
        return `
          var t = window["@babel/traverse"] || (window.Babel && window.Babel.packages && (window.Babel.packages.traverse.default || window.Babel.packages.traverse));
          export default t;
        `;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [processPolyfill(), babelExternals()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  resolve: {
    alias: {
      'crypto': path.resolve(__dirname, 'src/shims/crypto.js'),
      'util': path.resolve(__dirname, 'src/shims/util.js'),
      'fs': path.resolve(__dirname, 'src/shims/fs.js'),
      'path': path.resolve(__dirname, 'src/shims/path.js'),
    },
  },
  optimizeDeps: {
    include: ['pixi.js', 'babel-plugin-istanbul'],
    esbuildOptions: {
      plugins: [
        {
          name: 'babel-externals-esbuild',
          setup(build) {
            // Mark @babel/* as external so they don't get bundled by esbuild
            build.onResolve({ filter: /^@babel\/(core|traverse)$/ }, (args) => {
              return { path: args.path, external: true };
            });
          },
        },
      ],
    },
  },
  build: {
    rollupOptions: {
      onwarn: (warning, rollupWarn) => {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        rollupWarn(warning);
      },
    },
  },
});
