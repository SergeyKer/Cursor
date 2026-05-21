const fs = require('fs');
const path = require('path');

let cache = null;

function readJson(relativePath) {
  const filePath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCallData() {
  if (cache) return cache;
  cache = {
    meta: readJson('data/processes_meta.json'),
    processes: readJson('data/processes.json'),
    knowledge: readJson('data/knowledge.json'),
    communicationTools: readJson('data/communication_tools.json'),
  };
  return cache;
}

function clearCallDataCache() {
  cache = null;
}

module.exports = {
  loadCallData,
  clearCallDataCache,
};
