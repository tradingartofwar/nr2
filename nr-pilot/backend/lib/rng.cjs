const crypto = require('crypto');

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed = 1) {
  if (!Number.isInteger(seed)) {
    throw new Error('Seed must be an integer');
  }
  const rand = mulberry32(seed);
  const api = {
    rand,
    randInt(max) {
      return Math.floor(rand() * max);
    },
    choice(list) {
      if (!Array.isArray(list) || list.length === 0) throw new Error('choice requires a non-empty array');
      return list[api.randInt(list.length)];
    },
    shuffle(list) {
      const arr = list.slice();
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = api.randInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    uuidv4() {
      const bytes = Buffer.alloc(16);
      for (let i = 0; i < 16; i += 1) {
        bytes[i] = Math.floor(rand() * 256);
      }
      // Set version and variant bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = bytes.toString('hex');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  };
  return api;
}

module.exports = {
  createRng
};
