const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function getConversationOrFail(conversationId, userId) {
  const { data: convo, error } = await supabaseAdmin
    .from('conversations')
    .select('id, user_a, user_b')
    .eq('id', conversationId)
    .single();

  if (error || !convo) return { error: 'not_found' };
  if (convo.user_a !== userId && convo.user_b !== userId) return { error: 'forbidden' };
  return { convo };
}

// Step 1: confirm identity reveal ("Ready to be known, not just chatted with?").
// This is a separate confirmation from agreeing to plan something together —
// only once BOTH confirm does the planning tool unlock (design doc: "Identity reveal").
router.post('/:conversationId/confirm-identity', requireAuth, async (req, res) => {
  const { convo, error } = await getConversationOrFail(req.params.conversationId, req.user.id);
  if (error === 'not_found') return res.status(404).json({ error: 'Conversation not found' });
  if (error === 'forbidden') return res.status(403).json({ error: 'Not a participant' });

  const isUserA = convo.user_a === req.user.id;
  const field = isUserA ? 'user_a_identity_confirmed' : 'user_b_identity_confirmed';

  const { data: existing } = await supabaseAdmin
    .from('planning_sessions')
    .select('*')
    .eq('conversation_id', convo.id)
    .maybeSingle();

  let session;
  if (existing) {
    const { data, error: updateError } = await supabaseAdmin
      .from('planning_sessions')
      .update({ [field]: true })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateError) return res.status(500).json({ error: updateError.message });
    session = data;
  } else {
    const { data, error: insertError } = await supabaseAdmin
      .from('planning_sessions')
      .insert({ conversation_id: convo.id, [field]: true })
      .select()
      .single();
    if (insertError) return res.status(500).json({ error: insertError.message });
    session = data;
  }

  const unlocked = session.user_a_identity_confirmed && session.user_b_identity_confirmed;
  res.json({ unlocked });
});

// Step 2: once unlocked, each person submits their first/second choice of
// activity + area. The tool looks for any overlapping pair (design doc:
// "Meetup planning flow" — menu-driven suggestions to avoid decision paralysis).
router.post('/:conversationId/activity-choices', requireAuth, async (req, res) => {
  const { first, second } = req.body;
  if (!first?.type || !first?.area) {
    return res.status(400).json({ error: 'first choice (type + area) is required' });
  }

  const { convo, error } = await getConversationOrFail(req.params.conversationId, req.user.id);
  if (error === 'not_found') return res.status(404).json({ error: 'Conversation not found' });
  if (error === 'forbidden') return res.status(403).json({ error: 'Not a participant' });

  const { data: session } = await supabaseAdmin
    .from('planning_sessions')
    .select('*')
    .eq('conversation_id', convo.id)
    .maybeSingle();

  if (!session || !session.user_a_identity_confirmed || !session.user_b_identity_confirmed) {
    return res.status(403).json({ error: 'Planning tool is not unlocked yet for both people' });
  }

  const isUserA = convo.user_a === req.user.id;
  const field = isUserA ? 'user_a_activity_choices' : 'user_b_activity_choices';

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('planning_sessions')
    .update({ [field]: { first, second: second || null } })
    .eq('id', session.id)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  const resolved = resolveOverlap(updated.user_a_activity_choices, updated.user_b_activity_choices);
  if (resolved) {
    await supabaseAdmin
      .from('planning_sessions')
      .update({
        resolved_activity: resolved.activity,
        resolved_location: resolved.area,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', session.id);
  }

  res.json({ bothSubmitted: !!(updated.user_a_activity_choices && updated.user_b_activity_choices), resolved });
});

function resolveOverlap(choicesA, choicesB) {
  if (!choicesA || !choicesB) return null;
  const optionsA = [choicesA.first, choicesA.second].filter(Boolean);
  const optionsB = [choicesB.first, choicesB.second].filter(Boolean);

  for (const a of optionsA) {
    for (const b of optionsB) {
      if (a.type === b.type && a.area === b.area) {
        return { activity: a.type, area: a.area };
      }
    }
  }
  return null; // no overlap yet — humans decide manually
}

module.exports = router;
