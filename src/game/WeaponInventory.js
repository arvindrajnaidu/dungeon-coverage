const STORAGE_KEY = 'dungeon-coverage-weapons';
let _nextId = 1;

export default class WeaponInventory {
  constructor() {
    this.weapons = new Map();
    this._load();
  }

  add(type, value, name) {
    const id = `w${_nextId++}`;
    const weapon = {
      id,
      name: name || this.generateName(type, value),
      type,
      value,
      color: WeaponInventory.colorForType(type),
    };
    this.weapons.set(id, weapon);
    this._save();
    return weapon;
  }

  remove(id) {
    this.weapons.delete(id);
    this._save();
  }

  getAll() {
    return Array.from(this.weapons.values());
  }

  get(id) {
    return this.weapons.get(id);
  }

  generateName(type, value) {
    switch (type) {
      case 'number':
        return `Rune of ${value}`;
      case 'string':
        return `Scroll of '${value}'`;
      case 'boolean':
        return `Sigil of ${value ? 'True' : 'False'}`;
      case 'array':
        return `Quiver [${Array.isArray(value) ? value.length : 0}]`;
      default:
        return `Artifact`;
    }
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
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      for (const w of arr) {
        w.color = WeaponInventory.colorForType(w.type);
        this.weapons.set(w.id, w);
        // Keep _nextId ahead of any loaded id
        const num = parseInt(w.id.replace('w', ''), 10);
        if (num >= _nextId) _nextId = num + 1;
      }
    } catch (e) {
      // Corrupt data — start fresh
    }
  }

  static colorForType(type) {
    switch (type) {
      case 'number':  return 0x44aaff;
      case 'string':  return 0x44ff88;
      case 'boolean': return 0xff6644;
      case 'array':   return 0xffaa44;
      default:        return 0xaaaacc;
    }
  }
}
