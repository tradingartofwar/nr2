function validateArray(raw, predicate, label) {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) {
      console.warn(`[schema] ${label} expected array, received ${typeof raw}`);
    }
    return [];
  }

  const clean = [];
  for (const entry of raw) {
    if (predicate(entry)) {
      clean.push(entry);
    } else {
      console.warn(`[schema] Ignored malformed ${label.slice(0, -1)} entry:`, entry);
    }
  }
  return clean;
}

function validateNodes(raw) {
  return validateArray(
    raw,
    (node) => node && typeof node === 'object' && typeof node.id === 'string',
    'nodes'
  );
}

function validateSuggestions(raw) {
  return validateArray(
    raw,
    (suggestion) =>
      suggestion &&
      typeof suggestion === 'object' &&
      typeof suggestion.id === 'string' &&
      typeof suggestion.nodeId === 'string' &&
      typeof suggestion.otherId === 'string',
    'suggestions'
  );
}

function validateConsents(raw) {
  return validateArray(
    raw,
    (consent) => consent && typeof consent === 'object' && typeof consent.id === 'string',
    'consents'
  );
}

module.exports = {
  validateNodes,
  validateSuggestions,
  validateConsents
};
