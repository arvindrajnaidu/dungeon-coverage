export const TILE_SIZE = 32;
export const GRID_COLS = 30;
export const GRID_ROWS = 30;
export const VIEWPORT_WIDTH = 800;
export const VIEWPORT_HEIGHT = 600;

export const COLORS = {
  // Dungeon tiles - richer, more atmospheric colors
  FLOOR: 0x4a4a5e,
  WALL: 0x1a1a2e,
  CORRIDOR: 0x52526a,
  BRANCH_TILE: 0x5a3a6a,
  EXIT_TILE: 0x2a5a4a,
  ENTRY_TILE: 0x6a6a3a,

  // Gems - vibrant glowing colors
  GEM_UNCOLLECTED: 0x44bbff,
  GEM_COLLECTED: 0x44ff66,
  GEM_GHOST: 0x555577,

  // Player
  PLAYER: 0xff6644,

  // UI - deep blues and purples
  HUD_BG: 0x12192e,
  HUD_TEXT: 0xe8e8f0,
  PANEL_BG: 0x141e3a,
  PANEL_BORDER: 0x6a4a9a,
  BUTTON_BG: 0x4a3a7a,
  BUTTON_HOVER: 0x6a5a9a,
  BUTTON_TEXT: 0xffffff,

  // Progress bars
  PROGRESS_BG: 0x2a2a44,
  PROGRESS_FILL: 0x44ff66,
  PROGRESS_PARTIAL: 0xffaa44,

  // Weapons - magical glowing colors
  WEAPON_NUMBER: 0x44aaff,
  WEAPON_STRING: 0x44ff88,
  WEAPON_BOOLEAN: 0xff6644,
  WEAPON_ARRAY: 0xffaa44,
};

export const TILE_TYPES = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  BRANCH: 3,
  MERGE: 4,
  EXIT: 5,
  ENTRY: 6,
  CORRIDOR_H: 7,
  CORRIDOR_V: 8,
  DOOR_LEFT: 9,
  DOOR_RIGHT: 10,
  LOOP_BACK: 11,
  CATCH_ENTRY: 12,
};

export const PHASES = {
  SETUP: 'SETUP',
  EXECUTING: 'EXECUTING',
  ANIMATING: 'ANIMATING',
  RESULTS: 'RESULTS',
};
