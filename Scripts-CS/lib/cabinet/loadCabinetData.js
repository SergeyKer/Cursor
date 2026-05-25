const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/cabinet-demo.json');

let cached = null;

function loadCabinetData() {
  if (cached) return cached;
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  cached = JSON.parse(raw);
  return cached;
}

function clearCabinetDataCache() {
  cached = null;
}

module.exports = { loadCabinetData, clearCabinetDataCache, DATA_PATH };
