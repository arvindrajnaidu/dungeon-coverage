import * as PIXI from 'pixi.js';
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CODE_PANEL_WIDTH, INVENTORY_PANEL_WIDTH } from '../constants.js';
import Panel from './Panel.js';
import Button from './Button.js';

// Dungeon area dimensions (excluding code panel and inventory panel)
const DUNGEON_WIDTH = VIEWPORT_WIDTH - CODE_PANEL_WIDTH - INVENTORY_PANEL_WIDTH;
const DUNGEON_HEIGHT = VIEWPORT_HEIGHT;

export default class TestModal {
  constructor() {
    this.container = new PIXI.Container();
    this.container.visible = false;
    this.scrollY = 0;
    this.maxScroll = 0;

    // Dimming overlay (covers dungeon area only)
    this.overlay = new PIXI.Graphics();
    this.overlay.beginFill(0x000000, 0.7);
    this.overlay.drawRect(0, 0, DUNGEON_WIDTH, DUNGEON_HEIGHT);
    this.overlay.endFill();
    this.overlay.eventMode = 'static';
    this.overlay.on('pointertap', () => this.hide());
    this.container.addChild(this.overlay);

    this.panel = null;
    this._onWheel = this._onWheel.bind(this);
  }

  show(testRuns, fnName, levelName) {
    this.container.visible = true;
    this._buildPanel(testRuns, fnName, levelName);
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.addEventListener('wheel', this._onWheel, { passive: false });
  }

  hide() {
    this.container.visible = false;
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.removeEventListener('wheel', this._onWheel);
  }

  _buildPanel(testRuns, fnName, levelName) {
    if (this.panel) {
      this.container.removeChild(this.panel);
      this.panel.destroy({ children: true });
    }

    const panelW = Math.min(900, DUNGEON_WIDTH - 40);
    const panelH = 650;
    this.panel = new Panel(panelW, panelH);
    this.panel.centerOn(DUNGEON_WIDTH, DUNGEON_HEIGHT);

    // Title
    const title = new PIXI.Text(`TEST CASES - ${levelName || 'Level'}`, {
      fontFamily: 'monospace',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0x44aaff,
    });
    title.anchor.set(0.5, 0);
    title.x = panelW / 2;
    title.y = 12;
    this.panel.addChild(title);

    // Close button
    const closeBtn = new Button('Close', 80, 30);
    closeBtn.x = panelW - 96;
    closeBtn.y = 8;
    closeBtn.onClick(() => this.hide());
    this.panel.addChild(closeBtn);

    // Generate test code
    const testCode = this._generateTestCode(testRuns, fnName, levelName);

    // Log to console for easy copy/paste
    console.log('\n%c=== Generated Test Code ===', 'color: #44aaff; font-weight: bold; font-size: 14px;');
    console.log(testCode);
    console.log('%c=== End Test Code ===\n', 'color: #44aaff; font-weight: bold;');

    // Code area
    const codeAreaY = 44;
    const codeAreaH = panelH - 60;

    // Code background
    const codeBg = new PIXI.Graphics();
    codeBg.beginFill(0x0a0a1a, 0.9);
    codeBg.drawRoundedRect(10, codeAreaY, panelW - 20, codeAreaH, 4);
    codeBg.endFill();
    this.panel.addChild(codeBg);

    // Add line numbers and syntax-highlighted code
    const lines = testCode.split('\n');
    this.codeContent = new PIXI.Container();

    const lineHeight = 16;
    const gutterWidth = 40;

    for (let i = 0; i < lines.length; i++) {
      // Line number
      const lineNum = new PIXI.Text(`${i + 1}`, {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0x555577,
      });
      lineNum.x = 6;
      lineNum.y = i * lineHeight;
      this.codeContent.addChild(lineNum);

      // Code text
      const codeLine = new PIXI.Text(lines[i], {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: this._syntaxColor(lines[i]),
      });
      codeLine.x = gutterWidth;
      codeLine.y = i * lineHeight;
      this.codeContent.addChild(codeLine);
    }

    this.codeContent.x = 16;
    this.codeContent.y = codeAreaY + 8;

    // Mask for scrollable area
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawRect(10, codeAreaY, panelW - 20, codeAreaH);
    mask.endFill();
    this.panel.addChild(mask);
    this.codeContent.mask = mask;

    this.panel.addChild(this.codeContent);

    // Scroll state
    this.scrollY = 0;
    const contentHeight = lines.length * lineHeight + 16;
    this.maxScroll = Math.max(0, contentHeight - codeAreaH);
    this.codeAreaY = codeAreaY;

    this.container.addChild(this.panel);
  }

  _generateTestCode(testRuns, fnName, levelName) {
    if (!testRuns || testRuns.length === 0) {
      return `// No test runs yet for ${levelName || 'this level'}\n// Drop weapons into the slots and click RUN to create tests`;
    }

    const hasAnyStubs = testRuns.some(run => this._hasStubs(run.inputs));

    const lines = [];
    lines.push(`// Test file for: ${levelName || 'Level'}`);
    lines.push(`// Function: ${fnName}`);
    lines.push(`// Tests: ${testRuns.length}`);
    lines.push('');

    if (hasAnyStubs) {
      lines.push(`import { parseFn, Stubs } from '../maineffect';`);
    } else {
      lines.push(`import { parseFn } from '../maineffect';`);
    }
    lines.push('');
    lines.push(`describe('${fnName}', () => {`);
    lines.push(`  const parsedFn = parseFn(require.resolve('./${fnName}'));`);
    lines.push('');
    lines.push(`  beforeEach(() => {`);
    lines.push(`    parsedFn.reset();`);
    lines.push(`  });`);

    for (let i = 0; i < testRuns.length; i++) {
      const run = testRuns[i];
      // Use saved description or generate one from inputs
      const testDescription = run.description || this._describeInputs(run.inputs);
      const hasStubs = this._hasStubs(run.inputs);

      lines.push('');
      lines.push(`  // Test ${i + 1}`);
      lines.push(`  test('${testDescription}', async () => {`);

      if (hasStubs) {
        lines.push(`    const stubs = Stubs(jest.fn);`);
        lines.push('');
      }

      // Generate stub declarations and collect param names
      const paramLines = [];
      const stubNames = [];
      for (const [key, value] of Object.entries(run.inputs || {})) {
        if (value && value.__stub) {
          const stubLine = this._generateStubDeclaration(key, value);
          paramLines.push(`    ${stubLine}`);
          stubNames.push(key);
        }
      }

      if (paramLines.length > 0) {
        lines.push(...paramLines);
        lines.push('');
      }

      // Generate the function call
      const callArgs = this._generateCallArgs(run.inputs);
      lines.push(`    const result = await parsedFn`);
      lines.push(`      .find('${fnName}')`);
      lines.push(`      .callWith(${callArgs});`);
      lines.push('');

      // Generate expectations
      lines.push(`    expect(result).toMatchSnapshot();`);

      // Add stub verification for each stub
      for (const stubName of stubNames) {
        lines.push(`    expect(stubs.getStubs().${stubName}).toHaveBeenCalled();`);
      }

      lines.push(`  });`);
    }

    lines.push('});');

    return lines.join('\n');
  }

  _generateStubDeclaration(name, stubValue) {
    const returns = stubValue.returns;
    if (returns === undefined) {
      return `const ${name} = stubs.createStub('${name}').mockResolvedValue(undefined);`;
    }
    // Format the return value nicely
    const returnStr = JSON.stringify(returns, null, 2).replace(/\n/g, '\n    ');
    return `const ${name} = stubs.createStub('${name}').mockResolvedValue(${returnStr});`;
  }

  _generateCallArgs(inputs) {
    if (!inputs) return '';
    const args = [];
    for (const [key, value] of Object.entries(inputs)) {
      if (value && value.__stub) {
        args.push(key);
      } else {
        args.push(JSON.stringify(value));
      }
    }
    return args.join(', ');
  }

  _hasStubs(inputs) {
    if (!inputs) return false;
    return Object.values(inputs).some(v => v && v.__stub);
  }

  _describeInputs(inputs) {
    if (!inputs) return 'no inputs';
    const parts = [];
    for (const [key, value] of Object.entries(inputs)) {
      if (value && value.__stub) {
        const ret = value.returns;
        if (ret === undefined) {
          parts.push(`${key} as stub`);
        } else {
          parts.push(`${key} stub→${JSON.stringify(ret).substring(0, 10)}`);
        }
      } else if (typeof value === 'number') {
        if (value > 0) parts.push(`positive ${key}`);
        else if (value < 0) parts.push(`negative ${key}`);
        else parts.push(`zero ${key}`);
      } else if (typeof value === 'boolean') {
        parts.push(`${key}=${value}`);
      } else if (typeof value === 'string') {
        parts.push(`${key}="${value.substring(0, 10)}${value.length > 10 ? '...' : ''}"`);
      } else if (Array.isArray(value)) {
        parts.push(`${key} array[${value.length}]`);
      } else if (typeof value === 'object') {
        parts.push(`${key} object`);
      }
    }
    return parts.join(', ') || 'given inputs';
  }

  _syntaxColor(line) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) return 0x6a9955;  // Comments - green
    if (/^\s*(describe|test|it|beforeEach|afterEach|expect)\s*\(/.test(line)) return 0xdcdcaa;  // Test functions - yellow
    if (/^\s*(import|from|const|let|var|async|await|try|catch|return|if|else|for|while|require)\b/.test(line)) return 0xc586c0;  // Keywords - purple
    if (/\.(find|callWith|reset|toMatchSnapshot|mockResolvedValue|createStub|getStubs|toHaveBeenCalled)\s*\(/.test(line)) return 0x4ec9b0;  // Methods - teal
    if (/Stubs\s*\(/.test(line)) return 0x4ec9b0;  // Stubs factory - teal
    if (/['"`]/.test(trimmed)) return 0xce9178;  // Strings - orange
    if (/^\s*\d+/.test(trimmed) || /:\s*\d+/.test(trimmed)) return 0xb5cea8;  // Numbers - light green
    return 0xd4d4d4;  // Default - light gray
  }

  _onWheel(e) {
    if (!this.container.visible || !this.codeContent) return;
    e.preventDefault();
    this.scrollY = Math.min(this.maxScroll, Math.max(0, this.scrollY + e.deltaY * 0.5));
    this.codeContent.y = this.codeAreaY + 8 - this.scrollY;
  }

  get visible() {
    return this.container.visible;
  }

  getContainer() {
    return this.container;
  }
}
