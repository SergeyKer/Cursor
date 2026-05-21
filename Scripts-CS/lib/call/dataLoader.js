const fs = require('fs');
const path = require('path');

let cache = null;
let dataDir = null;

const DATA_DIR_CANDIDATES = [
  path.join(__dirname, '..', '..', 'data'),
  path.join(__dirname, '..', '..', 'frontend', 'data'),
  path.join(process.cwd(), 'data'),
  path.join(process.cwd(), 'frontend', 'data'),
];

function resolveDataDir() {
  for (const dir of DATA_DIR_CANDIDATES) {
    if (fs.existsSync(path.join(dir, 'processes_meta.json'))) return dir;
  }
  const tried = DATA_DIR_CANDIDATES.join(', ');
  throw new Error(`Call data not found (processes_meta.json). Checked: ${tried}`);
}

function getDataDir() {
  if (!dataDir) dataDir = resolveDataDir();
  return dataDir;
}

function readJson(filename) {
  const filePath = path.join(getDataDir(), filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCallData() {
  if (cache) return cache;
  cache = {
    meta: readJson('processes_meta.json'),
    processes: readJson('processes.json'),
    knowledge: readJson('knowledge.json'),
    communicationTools: readJson('communication_tools.json'),
  };
  return cache;
}

function clearCallDataCache() {
  cache = null;
  dataDir = null;
}

module.exports = {
  loadCallData,
  clearCallDataCache,
};
