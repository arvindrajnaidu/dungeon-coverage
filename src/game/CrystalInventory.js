const STORAGE_KEY = 'dungeon-coverage-crystals';
let _nextId = 1;

// Rune definitions (operators)
export const RUNES = {
  mirrors: { key: 'mirrors', label: 'Mirrors', operator: '===', preview: 'Result mirrors', needsValue: true, color: 0x88aaff },
  contrast: { key: 'contrast', label: 'Contrast', operator: '!==', preview: 'Result contrasts', needsValue: true, color: 0xff8866 },
  ascent: { key: 'ascent', label: 'Ascent', operator: '>', preview: 'Result ascends', needsValue: true, color: 0x66ffaa },
  descent: { key: 'descent', label: 'Descent', operator: '<', preview: 'Result descends', needsValue: true, color: 0xffaa66 },
  threshold: { key: 'threshold', label: 'Threshold', operator: '>=', preview: 'Result meets', needsValue: true, color: 0x88ff88 },
  ceiling: { key: 'ceiling', label: 'Ceiling', operator: '<=', preview: 'Result under', needsValue: true, color: 0xffff66 },
  light: { key: 'light', label: 'Light', operator: 'truthy', preview: 'Result shines', needsValue: false, color: 0xffffaa },
  shadow: { key: 'shadow', label: 'Shadow', operator: 'falsy', preview: 'Result dims', needsValue: false, color: 0x8888aa },
  embrace: { key: 'embrace', label: 'Embrace', operator: 'contains', preview: 'Result embraces', needsValue: true, color: 0xcc88ff },
};

export default class CrystalInventory {
  constructor() {
    this.crystals = new Map();
    this._load();
  }

  add(rune, essence, name) {
    const id = `c${_nextId++}`;
    const runeInfo = RUNES[rune];
    const crystal = {
      id,
      name: name || this.generateName(rune, essence),
      rune,
      essence,
      color: runeInfo?.color || 0xaaaaff,
    };
    this.crystals.set(id, crystal);
    this._save();
    return crystal;
  }

  remove(id) {
    this.crystals.delete(id);
    this._save();
  }

  update(id, rune, essence, name) {
    const existing = this.crystals.get(id);
    if (!existing) return null;

    const runeInfo = RUNES[rune];
    const crystal = {
      id,
      name: name || this.generateName(rune, essence),
      rune,
      essence,
      color: runeInfo?.color || 0xaaaaff,
    };
    this.crystals.set(id, crystal);
    this._save();
    return crystal;
  }

  getAll() {
    return Array.from(this.crystals.values());
  }

  get(id) {
    return this.crystals.get(id);
  }

  generateName(rune, essence) {
    const runeInfo = RUNES[rune];
    if (!runeInfo) return 'Unknown Crystal';

    const runeName = this._getRuneNameForValue(rune, essence);

    if (!runeInfo.needsValue) {
      return `Crystal of ${runeInfo.label}`;
    }

    const essenceStr = this._formatEssence(essence);
    return `Crystal of ${runeName} ${essenceStr}`;
  }

  _getRuneNameForValue(rune, essence) {
    switch (rune) {
      case 'mirrors': return 'Mirrored';
      case 'contrast': return 'Contrasting';
      case 'ascent': return 'Ascending';
      case 'descent': return 'Descending';
      case 'threshold': return 'Threshold';
      case 'ceiling': return 'Ceiling';
      case 'embrace': return 'Embracing';
      default: return RUNES[rune]?.label || 'Unknown';
    }
  }

  _formatEssence(essence) {
    if (essence === null) return 'null';
    if (essence === undefined) return 'undefined';
    if (typeof essence === 'string') return `"${essence}"`;
    if (typeof essence === 'number') return String(essence);
    if (typeof essence === 'boolean') return String(essence);
    if (Array.isArray(essence)) return `[${essence.length}]`;
    if (typeof essence === 'object') return `{${Object.keys(essence).length}}`;
    return String(essence);
  }

  // Evaluate a crystal against an actual result
  evaluate(crystal, actualResult) {
    const runeInfo = RUNES[crystal.rune];
    if (!runeInfo) return { pass: false, error: 'Unknown rune' };

    const expected = crystal.essence;
    const actual = actualResult;

    let pass = false;
    switch (runeInfo.operator) {
      case '===':
        pass = actual === expected;
        break;
      case '!==':
        pass = actual !== expected;
        break;
      case '>':
        pass = actual > expected;
        break;
      case '<':
        pass = actual < expected;
        break;
      case '>=':
        pass = actual >= expected;
        break;
      case '<=':
        pass = actual <= expected;
        break;
      case 'truthy':
        pass = !!actual;
        break;
      case 'falsy':
        pass = !actual;
        break;
      case 'contains':
        if (typeof actual === 'string') {
          pass = actual.includes(expected);
        } else if (Array.isArray(actual)) {
          pass = actual.includes(expected);
        } else {
          pass = false;
        }
        break;
      default:
        return { pass: false, error: 'Unknown operator' };
    }

    return {
      pass,
      expected: runeInfo.needsValue ? expected : runeInfo.operator,
      actual,
      operator: runeInfo.operator,
      preview: runeInfo.preview,
    };
  }

  _save() {
    try {
      const arr = this.getAll();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      // localStorage unavailable or full — silently ignore
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const c of arr) {
            const runeInfo = RUNES[c.rune];
            c.color = runeInfo?.color || 0xaaaaff;
            this.crystals.set(c.id, c);
            // Keep _nextId ahead of any loaded id
            const num = parseInt(c.id.replace('c', ''), 10);
            if (num >= _nextId) _nextId = num + 1;
          }
        }
      }
    } catch (e) {
      // Corrupt data — start fresh
    }

    // Add default crystal if inventory is empty
    if (this.crystals.size === 0) {
      this.add('mirrors', 5, 'Crystal of Mirrored 5');
    }
  }

  clear() {
    this.crystals.clear();
    _nextId = 1;
    this._save();
  }
}
