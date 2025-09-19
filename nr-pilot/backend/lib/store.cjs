const fs = require('fs/promises');
const path = require('path');
const { constants } = require('fs');

let cachedStateDir = null;

function resolveStateDir() {
  const dir = process.env.NR_STATE_DIR;
  if (!dir || !dir.trim()) {
    throw new Error('NR_STATE_DIR is required but not set');
  }
  return path.resolve(dir.trim());
}

function getStateDir() {
  if (!cachedStateDir) {
    cachedStateDir = resolveStateDir();
  }
  return cachedStateDir;
}

async function ensureStateDir({ allowInit = false } = {}) {
  const dir = getStateDir();
  try {
    await fs.access(dir, constants.R_OK | constants.W_OK);
    return dir;
  } catch (err) {
    if (err.code === 'ENOENT') {
      if (!allowInit) {
        throw new Error(`State directory ${dir} does not exist. Set NR_ALLOW_INIT_DIR=true to create it automatically.`);
      }
      await fs.mkdir(dir, { recursive: true });
      return dir;
    }
    throw new Error(`State directory ${dir} is not accessible: ${err.message}`);
  }
}

function resolveFilePath(fileName) {
  if (!fileName) throw new Error('fileName is required');
  const dir = getStateDir();
  const resolved = path.resolve(dir, fileName);
  if (!resolved.startsWith(dir + path.sep) && resolved !== dir) {
    throw new Error(`Invalid file path ${fileName}`);
  }
  return resolved;
}

async function readJsonSafe(fileName, fallback = []) {
  const filePath = resolveFilePath(fileName);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    console.warn(`[store] Failed to read ${fileName}: ${err.message}`);
    return fallback;
  }
}

async function writeJsonAtomic(fileName, data) {
  const filePath = resolveFilePath(fileName);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, payload, 'utf8');
  await fs.rename(tmpPath, filePath);
}

async function countOf(fileName) {
  const data = await readJsonSafe(fileName, []);
  return Array.isArray(data) ? data.length : 0;
}

module.exports = {
  getStateDir,
  ensureStateDir,
  readJsonSafe,
  writeJsonAtomic,
  countOf,
  resolveFilePath
};
