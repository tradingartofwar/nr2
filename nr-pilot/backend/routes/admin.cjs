const { readJsonSafe, writeJsonAtomic, appendJsonLine } = require('../lib/store.cjs');
const { validateSuggestions } = require('../lib/schema.cjs');

function nowIso() {
  return new Date().toISOString();
}

function matchesEnumerated(field, allowedValues) {
  return (suggestion, matchValues) => {
    if (!Array.isArray(matchValues) || matchValues.length === 0) return false;
    if (typeof suggestion[field] === 'string') {
      return matchValues.includes(suggestion[field]);
    }
    return false;
  };
}

const filterMatchers = {
  ids: (suggestion, ids) => Array.isArray(ids) && ids.includes(suggestion.id),
  cohortIds: matchesEnumerated('cohortId'),
  states: matchesEnumerated('state')
};

function filterSuggestions(suggestions, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return suggestions;
  return suggestions.filter((suggestion) =>
    Object.entries(filter).every(([key, value]) => {
      const matcher = filterMatchers[key];
      if (!matcher) return true;
      return matcher(suggestion, value);
    })
  );
}

async function loadSuggestions() {
  const raw = await readJsonSafe('state.suggestions.json', []);
  return validateSuggestions(raw);
}

async function saveSuggestions(next) {
  await writeJsonAtomic('state.suggestions.json', next);
}

async function appendEvent(action, payload = {}) {
  const event = {
    ts: nowIso(),
    actor: 'admin',
    action,
    ...payload
  };
  await appendJsonLine('events.log.jsonl', event);
}

module.exports = async function registerAdminRoutes(fastify) {
  fastify.get('/admin/pending', async (request, reply) => {
    const suggestions = await loadSuggestions();
    const pending = filterSuggestions(suggestions, {
      states: request.query.states || ['ghost', 'admin_approved']
    });
    return { ok: true, data: pending };
  });

  fastify.post('/admin/approve', async (request, reply) => {
    const ids = request.body && request.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ ok: false, error: { message: 'ids array is required' } });
    }
    const suggestions = await loadSuggestions();
    let updates = 0;
    const next = suggestions.map((suggestion) => {
      if (ids.includes(suggestion.id) && suggestion.state === 'ghost') {
        updates += 1;
        return { ...suggestion, state: 'admin_approved', updatedAt: nowIso() };
      }
      return suggestion;
    });
    await saveSuggestions(next);
    await appendEvent('approve', { ids, count: updates });
    return { ok: true, count: updates };
  });

  fastify.post('/consent', async (request, reply) => {
    const payload = request.body || {};
    const ids = Array.isArray(payload.ids) ? payload.ids : [payload.id].filter(Boolean);
    if (ids.length === 0) {
      return reply.status(400).send({ ok: false, error: { message: 'id(s) required' } });
    }
    if (!['accept', 'decline'].includes(payload.action)) {
      return reply.status(400).send({ ok: false, error: { message: 'action must be accept or decline' } });
    }

    const suggestions = await loadSuggestions();
    let updates = 0;
    const next = suggestions.map((suggestion) => {
      if (!ids.includes(suggestion.id) || suggestion.state === 'solid' || suggestion.state === 'declined') {
        return suggestion;
      }
      if (payload.action === 'accept') {
        const acceptance = new Set(Array.isArray(suggestion.acceptedBy) ? suggestion.acceptedBy : []);
        acceptance.add(payload.userId || 'unknown');
        if (acceptance.size >= 2) {
          updates += 1;
          return {
            ...suggestion,
            state: 'solid',
            acceptedBy: Array.from(acceptance),
            consented: true,
            finalizedAt: nowIso()
          };
        }
        updates += 1;
        return {
          ...suggestion,
          state: 'admin_approved',
          acceptedBy: Array.from(acceptance),
          updatedAt: nowIso()
        };
      }

      updates += 1;
      return {
        ...suggestion,
        state: 'declined',
        declinedBy: payload.userId || 'unknown',
        updatedAt: nowIso()
      };
    });

    await saveSuggestions(next);
    await appendEvent('consent', { ids, action: payload.action, count: updates });
    return { ok: true, count: updates };
  });

  fastify.post('/admin/reset', async (request, reply) => {
    const suggestions = await readJsonSafe('state.suggestions.json', []);
    const nodes = await readJsonSafe('state.nodes.json', []);
    const summary = { nodes: nodes.length, suggestions: suggestions.length };
    await writeJsonAtomic('state.suggestions.json', []);
    await appendEvent('reset', summary);
    return { ok: true, message: 'suggestions cleared', summary };
  });
};
