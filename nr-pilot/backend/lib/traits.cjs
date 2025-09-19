const STRENGTHS = ['systems', 'ops', 'facilitation', 'design', 'ml', 'research', 'growth', 'product'];
const CHALLENGES = ['focus', 'handoffs', 'messaging', 'recruiting', 'time'];
const INTERESTS = ['ml', 'climate', 'education', 'health', 'ops', 'community'];
const VALUES = ['craft', 'impact', 'play', 'clarity', 'care'];
const PROJECTS = ['pilot', 'atlas', 'lab', 'onboarding'];

function pickSet(rng, list, min = 1, max = 3) {
  if (min > max) throw new Error('min cannot exceed max');
  const targetSize = min + rng.randInt(max - min + 1);
  const shuffled = rng.shuffle(list);
  return shuffled.slice(0, Math.min(targetSize, shuffled.length));
}

function toSet(arr) {
  return new Set(arr);
}

function jaccard(aList, bList) {
  const a = toSet(aList);
  const b = toSet(bList);
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreOverlap(nodeA, nodeB) {
  const strengthsScore = jaccard(nodeA.strengths, nodeB.strengths);
  const interestsScore = jaccard(nodeA.interests, nodeB.interests);
  return Number((strengthsScore * 0.7 + interestsScore * 0.3).toFixed(2));
}

function publicRationale(nodeA, nodeB, score) {
  const mention = score >= 0.5 ? 'strong overlap' : 'potential synergy';
  return `${nodeA.displayName} and ${nodeB.displayName} show ${mention} on strengths/interests.`;
}

module.exports = {
  STRENGTHS,
  CHALLENGES,
  INTERESTS,
  VALUES,
  PROJECTS,
  pickSet,
  jaccard,
  scoreOverlap,
  publicRationale
};
