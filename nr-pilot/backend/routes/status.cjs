const path = require('path');
const { getStateDir, readJsonSafe } = require('../lib/store.cjs');
const { validateNodes, validateSuggestions, validateConsents } = require('../lib/schema.cjs');
const { version } = require('../../package.json');

const bootTs = new Date().toISOString();

const FILES = {
  nodes: 'state.nodes.json',
  suggestions: 'state.suggestions.json',
  consents: 'state.consents.json'
};

async function loadCounts() {
  const [nodesRaw, suggestionsRaw, consentsRaw] = await Promise.all([
    readJsonSafe(FILES.nodes, []),
    readJsonSafe(FILES.suggestions, []),
    readJsonSafe(FILES.consents, [])
  ]);

  const nodes = validateNodes(nodesRaw);
  const suggestions = validateSuggestions(suggestionsRaw);
  const consents = validateConsents(consentsRaw);

  return {
    nodes,
    suggestions,
    consents
  };
}

async function statusHandler() {
  const stateDir = getStateDir();
  const { nodes, suggestions, consents } = await loadCounts();

  return {
    healthy: true,
    bootTs,
    version,
    stateDir,
    counts: {
      nodes: nodes.length,
      suggestions: suggestions.length,
      consents: consents.length
    },
    files: {
      nodes: path.join(stateDir, FILES.nodes),
      suggestions: path.join(stateDir, FILES.suggestions),
      consents: path.join(stateDir, FILES.consents)
    }
  };
}

module.exports = async function registerStatusRoute(fastify) {
  fastify.get('/status', async () => statusHandler());
};
