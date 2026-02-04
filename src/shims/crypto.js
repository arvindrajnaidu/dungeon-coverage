// Minimal crypto.createHash shim for istanbul-lib-instrument in the browser.
// Istanbul only uses createHash('sha1') for content hashing — no security needed.

function simpleHash(data) {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function createHash(algorithm) {
  let _data = '';
  return {
    update(data) { _data += String(data); return this; },
    digest(encoding) {
      const h = simpleHash(_data);
      return h + simpleHash(h + _data) + simpleHash(_data + h) + simpleHash(h);
    },
  };
}

export default { createHash };
