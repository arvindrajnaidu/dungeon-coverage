import * as PIXI from 'pixi.js';
import { COLORS } from '../constants.js';

/**
 * CodePanel - displays source code with syntax highlighting on the left side of the screen.
 * Highlights lines as the hero walks through them (correlating with gem collection).
 */
export default class CodePanel extends PIXI.Container {
  constructor(width, height) {
    super();
    this.panelWidth = width;
    this.panelHeight = height;
    this.lineHeight = 18;
    this.gutterWidth = 36;
    this.padding = 12;
    this.lines = [];
    this.lineContainers = [];
    this.highlightedLines = new Set();
    this.currentLine = null;

    // Background
    this.bg = new PIXI.Graphics();
    this.bg.beginFill(0x0d1117, 0.95);
    this.bg.lineStyle(2, 0x30363d);
    this.bg.drawRect(0, 0, width, height);
    this.bg.endFill();
    this.addChild(this.bg);

    // Header
    this.header = new PIXI.Container();
    const headerBg = new PIXI.Graphics();
    headerBg.beginFill(0x161b22);
    headerBg.drawRect(0, 0, width, 32);
    headerBg.endFill();
    this.header.addChild(headerBg);

    this.titleText = new PIXI.Text('Source Code', {
      fontFamily: 'monospace',
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0x8b949e,
    });
    this.titleText.x = 12;
    this.titleText.y = 8;
    this.header.addChild(this.titleText);

    this.addChild(this.header);

    // Code container (scrollable)
    this.codeContainer = new PIXI.Container();
    this.codeContainer.y = 36;
    this.addChild(this.codeContainer);

    // Scroll state
    this.scrollY = 0;
    this.maxScroll = 0;
    this.codeAreaHeight = height - 40;

    // Mask for code area
    this.codeMask = new PIXI.Graphics();
    this.codeMask.beginFill(0xffffff);
    this.codeMask.drawRect(0, 36, width, this.codeAreaHeight);
    this.codeMask.endFill();
    this.addChild(this.codeMask);
    this.codeContainer.mask = this.codeMask;

    // Bind scroll handler
    this._onWheel = this._onWheel.bind(this);
  }

  setSource(source, levelName) {
    // Clear existing
    this.codeContainer.removeChildren();
    this.lineContainers = [];
    this.highlightedLines.clear();
    this.currentLine = null;
    this.scrollY = 0;

    // Update title
    this.titleText.text = levelName || 'Source Code';

    // Parse lines - don't trim to preserve line number alignment with coverage data
    // Remove only trailing whitespace, keep leading newlines for line number accuracy
    this.lines = source.trimEnd().split('\n');

    // Skip empty leading lines in display but track offset for line numbers
    this.lineOffset = 0;
    while (this.lineOffset < this.lines.length && this.lines[this.lineOffset].trim() === '') {
      this.lineOffset++;
    }
    // Slice to skip empty leading lines
    this.displayLines = this.lines.slice(this.lineOffset);

    // Gutter background
    const gutterBg = new PIXI.Graphics();
    gutterBg.beginFill(0x0d1117);
    gutterBg.drawRect(0, 0, this.gutterWidth, this.displayLines.length * this.lineHeight + 20);
    gutterBg.endFill();
    this.codeContainer.addChild(gutterBg);

    // Create line containers (using displayLines but showing correct line numbers)
    for (let i = 0; i < this.displayLines.length; i++) {
      const actualLineNumber = i + this.lineOffset + 1; // 1-indexed line number in original source
      const lineContainer = new PIXI.Container();
      lineContainer.y = i * this.lineHeight + this.padding;

      // Line highlight background (initially invisible)
      const highlightBg = new PIXI.Graphics();
      highlightBg.beginFill(0x1f6feb, 0.15);
      highlightBg.drawRect(0, -2, this.panelWidth, this.lineHeight);
      highlightBg.endFill();
      highlightBg.visible = false;
      highlightBg.name = 'highlight';
      lineContainer.addChild(highlightBg);

      // Current line indicator (execution marker)
      const currentMarker = new PIXI.Graphics();
      currentMarker.beginFill(0x3fb950);
      currentMarker.drawRect(0, 0, 3, this.lineHeight - 4);
      currentMarker.endFill();
      currentMarker.visible = false;
      currentMarker.name = 'currentMarker';
      lineContainer.addChild(currentMarker);

      // Line number (show actual line number from original source)
      const lineNum = new PIXI.Text(`${actualLineNumber}`, {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0x484f58,
      });
      lineNum.x = this.gutterWidth - lineNum.width - 8;
      lineNum.name = 'lineNum';
      lineNum.lineNumber = actualLineNumber; // Store for later lookup
      lineContainer.addChild(lineNum);

      // Code text with syntax highlighting
      const codeText = this._createHighlightedLine(this.displayLines[i]);
      codeText.x = this.gutterWidth + 8;
      lineContainer.addChild(codeText);

      this.codeContainer.addChild(lineContainer);
      this.lineContainers.push({ container: lineContainer, lineNumber: actualLineNumber });
    }

    // Calculate max scroll
    const contentHeight = this.displayLines.length * this.lineHeight + this.padding * 2;
    this.maxScroll = Math.max(0, contentHeight - this.codeAreaHeight);

    // Enable scroll
    this._enableScroll();
  }

  _createHighlightedLine(line) {
    // Simple token-based syntax highlighting
    const container = new PIXI.Container();
    const tokens = this._tokenize(line);
    let x = 0;

    for (const token of tokens) {
      const text = new PIXI.Text(token.text, {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: token.color,
      });
      text.x = x;
      container.addChild(text);
      x += text.width;
    }

    return container;
  }

  _tokenize(line) {
    const tokens = [];
    const keywords = /\b(function|const|let|var|return|if|else|for|while|do|switch|case|break|default|try|catch|finally|throw|new|await|async|export|import|from|class|extends|static|get|set|typeof|instanceof|in|of|true|false|null|undefined)\b/g;
    const strings = /(['"`])(?:(?!\1|\\).|\\.)*\1/g;
    const comments = /\/\/.*$|\/\*[\s\S]*?\*\//g;
    const numbers = /\b\d+\.?\d*\b/g;
    const functions = /\b([a-zA-Z_]\w*)\s*(?=\()/g;

    // Simple approach: color the whole line based on content type
    const trimmed = line.trim();

    // Comment
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return [{ text: line, color: 0x6a9955 }];
    }

    // Split by tokens - simplified approach
    let remaining = line;
    let match;

    // Check for keywords
    const keywordMatches = [];
    const keywordRegex = /\b(function|const|let|var|return|if|else|for|while|do|switch|case|break|default|try|catch|finally|throw|new|await|async|export|import|from|class|extends|true|false|null|undefined)\b/g;

    while ((match = keywordRegex.exec(line)) !== null) {
      keywordMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0], color: 0xc586c0 });
    }

    // Check for strings
    const stringMatches = [];
    const stringRegex = /(['"`])(?:(?!\1|\\).|\\.)*\1/g;
    while ((match = stringRegex.exec(line)) !== null) {
      stringMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0], color: 0xce9178 });
    }

    // Check for numbers
    const numberMatches = [];
    const numberRegex = /\b\d+\.?\d*\b/g;
    while ((match = numberRegex.exec(line)) !== null) {
      numberMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0], color: 0xb5cea8 });
    }

    // Merge all matches
    const allMatches = [...keywordMatches, ...stringMatches, ...numberMatches];
    allMatches.sort((a, b) => a.start - b.start);

    // Remove overlapping (strings take precedence)
    const filtered = [];
    for (const m of allMatches) {
      const overlaps = filtered.some(f => (m.start >= f.start && m.start < f.end) || (m.end > f.start && m.end <= f.end));
      if (!overlaps) filtered.push(m);
    }

    // Build tokens
    let pos = 0;
    for (const m of filtered) {
      if (m.start > pos) {
        tokens.push({ text: line.slice(pos, m.start), color: 0xe6edf3 });
      }
      tokens.push({ text: m.text, color: m.color });
      pos = m.end;
    }

    if (pos < line.length) {
      tokens.push({ text: line.slice(pos), color: 0xe6edf3 });
    }

    if (tokens.length === 0) {
      tokens.push({ text: line, color: 0xe6edf3 });
    }

    return tokens;
  }

  // Find the container for a given line number
  _findContainerByLine(lineNumber) {
    for (const entry of this.lineContainers) {
      if (entry.lineNumber === lineNumber) {
        return entry;
      }
    }
    return null;
  }

  highlightLine(lineNumber, isCurrent = false) {
    const entry = this._findContainerByLine(lineNumber);
    if (!entry) return;

    const container = entry.container;

    // Mark as highlighted (covered)
    this.highlightedLines.add(lineNumber);
    const highlight = container.getChildByName('highlight');
    if (highlight) {
      highlight.visible = true;
      highlight.clear();
      highlight.beginFill(0x238636, 0.2);
      highlight.drawRect(0, -2, this.panelWidth, this.lineHeight);
      highlight.endFill();
    }

    // Update line number color
    const lineNum = container.getChildByName('lineNum');
    if (lineNum) {
      lineNum.style.fill = 0x3fb950;
    }

    if (isCurrent) {
      this._setCurrentLine(lineNumber);
    }
  }

  _setCurrentLine(lineNumber) {
    // Clear previous current marker
    if (this.currentLine !== null && this.currentLine !== lineNumber) {
      const prevEntry = this._findContainerByLine(this.currentLine);
      if (prevEntry) {
        const prevMarker = prevEntry.container.getChildByName('currentMarker');
        if (prevMarker) prevMarker.visible = false;
      }
    }

    this.currentLine = lineNumber;
    const entry = this._findContainerByLine(lineNumber);
    if (!entry) return;

    // Show current marker
    const marker = entry.container.getChildByName('currentMarker');
    if (marker) marker.visible = true;

    // Auto-scroll to keep current line visible
    this._scrollToLine(lineNumber);
  }

  _scrollToLine(lineNumber) {
    // Find the index of this line in the display
    const idx = this.lineContainers.findIndex(e => e.lineNumber === lineNumber);
    if (idx < 0) return;

    const lineY = idx * this.lineHeight + this.padding;
    const viewTop = this.scrollY;
    const viewBottom = this.scrollY + this.codeAreaHeight;

    if (lineY < viewTop + 40) {
      this.scrollY = Math.max(0, lineY - 40);
    } else if (lineY > viewBottom - 60) {
      this.scrollY = Math.min(this.maxScroll, lineY - this.codeAreaHeight + 60);
    }

    this.codeContainer.y = 36 - this.scrollY;
  }

  clearHighlights() {
    this.highlightedLines.clear();
    this.currentLine = null;

    for (const entry of this.lineContainers) {
      const container = entry.container;
      const highlight = container.getChildByName('highlight');
      if (highlight) highlight.visible = false;

      const marker = container.getChildByName('currentMarker');
      if (marker) marker.visible = false;

      const lineNum = container.getChildByName('lineNum');
      if (lineNum) lineNum.style.fill = 0x484f58;
    }
  }

  _enableScroll() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('wheel', this._onWheel, { passive: false });
    }
  }

  _disableScroll() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('wheel', this._onWheel);
    }
  }

  _onWheel(e) {
    // Check if mouse is over the code panel
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Only scroll if mouse is in the code panel area
    if (mouseX < this.panelWidth) {
      e.preventDefault();
      this.scrollY = Math.min(this.maxScroll, Math.max(0, this.scrollY + e.deltaY * 0.5));
      this.codeContainer.y = 36 - this.scrollY;
    }
  }

  destroy(options) {
    this._disableScroll();
    super.destroy(options);
  }
}
