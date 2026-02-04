// Minimal fs shim for browser (istanbul needs realpath/realpathSync)
export function realpath(p, cb) {
  if (cb) cb(null, p);
  return p;
}

export function realpathSync(p) {
  return p;
}

export function readFileSync() {
  return '';
}

export function existsSync() {
  return false;
}

export function statSync() {
  return { isFile: () => false, isDirectory: () => false };
}

export default { realpath, realpathSync, readFileSync, existsSync, statSync };
