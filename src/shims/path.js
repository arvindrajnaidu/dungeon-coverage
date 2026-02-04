// Minimal path shim for browser
export const sep = '/';
export const delimiter = ':';

export function resolve(...args) {
  return args.join('/').replace(/\/+/g, '/') || '/';
}

export function join(...args) {
  return args.join('/').replace(/\/+/g, '/');
}

export function dirname(p) {
  const parts = String(p).split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function basename(p, ext) {
  let base = String(p).split('/').pop() || '';
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length);
  }
  return base;
}

export function extname(p) {
  const base = basename(p);
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(idx) : '';
}

export function normalize(p) {
  return String(p).replace(/\/+/g, '/');
}

export function isAbsolute(p) {
  return String(p).startsWith('/');
}

export function relative(from, to) {
  return to;
}

export const posix = { sep: '/', delimiter: ':', join, resolve, dirname, basename, extname, normalize, isAbsolute, relative };

export default { sep, delimiter, resolve, join, dirname, basename, extname, normalize, isAbsolute, relative, posix };
