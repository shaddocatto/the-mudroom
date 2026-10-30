// AI pre-screening using OpenAI's moderation endpoint (free, bundled with API usage).
// Decision log: see design doc "Tech stack" section — picked over a dedicated
// paid service (e.g. Hive) purely on cost.
//
// Three outcomes, matching the "Moderation workflow" design decision:
//   'confident_clean'      -> post goes live immediately (shown as "pending" briefly, undoable)
//   'confident_violation'  -> blocked outright, with a specific reason
//   'uncertain'            -> stays "pending", routed to a human reviewer

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';

// Thresholds are deliberately conservative to start — tune once real data exists.
const VIOLATION_THRESHOLD = 0.7; // category_scores above this -> confident violation
const CLEAN_THRESHOLD = 0.2; // all category_scores below this -> confident clean

async function moderatePost(body) {
  if (!process.env.OPENAI_API_KEY) {
    // No key configured yet — fail safe by routing everything to human review
    // rather than either silently publishing or silently blocking.
    return { verdict: 'uncertain', reason: null, raw: null };
  }

  const response = await fetch(OPENAI_MODERATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: body }),
  });

  if (!response.ok) {
    // Moderation API itself failed — don't let that silently publish anything.
    return { verdict: 'uncertain', reason: null, raw: null };
  }

  const data = await response.json();
  const result = data.results?.[0];
  if (!result) {
    return { verdict: 'uncertain', reason: null, raw: null };
  }

  const scores = result.category_scores || {};
  const flaggedCategories = Object.entries(scores).filter(
    ([, score]) => score >= VIOLATION_THRESHOLD
  );

  if (result.flagged && flaggedCategories.length > 0) {
    const [topCategory] = flaggedCategories.sort((a, b) => b[1] - a[1]);
    return {
      verdict: 'confident_violation',
      reason: humanReadableReason(topCategory[0]),
      raw: result,
    };
  }

  const allLow = Object.values(scores).every((score) => score < CLEAN_THRESHOLD);
  if (allLow) {
    return { verdict: 'confident_clean', reason: null, raw: result };
  }

  return { verdict: 'uncertain', reason: null, raw: result };
}

function humanReadableReason(category) {
  const labels = {
    harassment: 'this included language that reads as harassment',
    'harassment/threatening': 'this included a threatening statement',
    hate: 'this included hate speech',
    'hate/threatening': 'this included a threatening, hateful statement',
    'self-harm': 'this referenced self-harm in a way our guidelines don’t allow unmoderated',
    'self-harm/intent': 'this expressed intent of self-harm',
    'self-harm/instructions': 'this included self-harm instructions',
    sexual: 'this included sexual content',
    'sexual/minors': 'this included sexual content involving minors',
    violence: 'this included violent content',
    'violence/graphic': 'this included graphic violent content',
  };
  return labels[category] || "this didn't meet our community guidelines";
}

module.exports = { moderatePost };
