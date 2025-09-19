#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { ensureStateDir, resolveFilePath, writeJsonAtomic, appendJsonLine } = require('../backend/lib/store.cjs');
const { createRng } = require('../backend/lib/rng.cjs');
const {
  STRENGTHS,
  CHALLENGES,
  INTERESTS,
  VALUES,
  PROJECTS,
  pickSet,
  scoreOverlap,
  publicRationale
} = require('../backend/lib/traits.cjs');

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = { force: false };
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    if (key === 'force') {
      options.force = true;
      continue;
    }
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    i += 1;
    options[key] = value;
  }
  return options;
}

function assertOptions(opts) {
  if (!opts.cohort) throw new Error('--cohort is required');
  const n = Number.parseInt(opts.n, 10);
  if (!Number.isFinite(n) || n <= 0) throw new Error('--n must be a positive integer');
  const k = Number.parseInt(opts.k, 10);
  if (!Number.isFinite(k) || k < 0) throw new Error('--k must be a non-negative integer');
  const seed = opts.seed === undefined ? 1 : Number.parseInt(opts.seed, 10);
  if (!Number.isFinite(seed)) throw new Error('--seed must be an integer');
  return { cohort: opts.cohort, n, k, seed, force: Boolean(opts.force) };
}

function baseTimestampMs() {
  return Date.UTC(2024, 0, 1, 0, 0, 0, 0);
}

function buildNode(idx, rng, cohort) {
  const createdAt = new Date(baseTimestampMs() + idx * 60000).toISOString();
  return {
    id: rng.uuidv4(),
    cohortId: cohort,
    displayName: `User ${idx + 1}`,
    alias: `U${idx + 1}`,
    email: null,
    strengths: pickSet(rng, STRENGTHS, 2, 3),
    challenges: pickSet(rng, CHALLENGES, 1, 2),
    projects: pickSet(rng, PROJECTS, 1, 2),
    interests: pickSet(rng, INTERESTS, 1, 3),
    values: pickSet(rng, VALUES, 1, 2),
    consent: { shareProfile: true },
    createdAt
  };
}

function buildSuggestions(nodes, k, rng) {
  if (k === 0 || nodes.length < 2) return [];
  const pairs = new Set();
  const suggestions = [];
  let createdOffset = 0;
  const incrementMs = 30000;

  for (let i = 0; i < nodes.length; i += 1) {
    const nodeA = nodes[i];
    let edgesForNode = 0;
    let attempts = 0;
    const maxAttempts = nodes.length * 5;
    while (edgesForNode < k && attempts < maxAttempts) {
      attempts += 1;
      const otherIndex = rng.randInt(nodes.length);
      if (otherIndex === i) continue;
      const nodeB = nodes[otherIndex];
      const [aId, bId] = nodeA.id < nodeB.id ? [nodeA.id, nodeB.id] : [nodeB.id, nodeA.id];
      const key = `${aId}|${bId}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      const score = scoreOverlap(nodeA, nodeB);
      const createdAt = new Date(baseTimestampMs() + nodes.length * 60000 + createdOffset).toISOString();
      createdOffset += incrementMs;
      suggestions.push({
        id: rng.uuidv4(),
        cohortId: nodeA.cohortId,
        a: aId,
        b: bId,
        state: 'ghost',
        score,
        rationale_public: publicRationale(nodeA, nodeB, score),
        createdAt
      });
      edgesForNode += 1;
    }
  }
  return suggestions;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

async function appendEvent(event) {
  await appendJsonLine('events.log.jsonl', event);
}

(async () => {
  try {
    const opts = assertOptions(parseArgs(process.argv));
    const allowInit = process.env.NR_ALLOW_INIT_DIR === 'true';
    await ensureStateDir({ allowInit });

    const nodesFile = resolveFilePath('state.nodes.json');
    const suggestionsFile = resolveFilePath('state.suggestions.json');

    if (!opts.force) {
      const existingNodes = await fileExists(nodesFile);
      const existingSuggestions = await fileExists(suggestionsFile);
      if (existingNodes || existingSuggestions) {
        console.error('State files already exist. Use --force to overwrite.');
        process.exit(1);
      }
    }

    const rng = createRng(opts.seed);
    const nodes = Array.from({ length: opts.n }, (_, idx) => buildNode(idx, rng, opts.cohort));
    const suggestions = buildSuggestions(nodes, opts.k, rng);

    await writeJsonAtomic('state.nodes.json', nodes);
    await writeJsonAtomic('state.suggestions.json', suggestions);

    const now = new Date().toISOString();
    await appendEvent({ ts: now, actor: 'seed', action: 'seed_nodes', cohort: opts.cohort, count: nodes.length });
    await appendEvent({ ts: now, actor: 'seed', action: 'seed_suggestions', cohort: opts.cohort, count: suggestions.length });

    console.log(`Seed complete. Nodes: ${nodes.length}. Suggestions: ${suggestions.length}.`);
    console.log(`Wrote ${nodesFile}`);
    console.log(`Wrote ${suggestionsFile}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
