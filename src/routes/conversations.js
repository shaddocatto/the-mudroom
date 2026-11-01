const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { sendNudgeIfWarranted } = require('../services/signals');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*, user_a_profile:profiles!conversations_user_a_fkey(id, display_name), user_b_profile:profiles!conversations_user_b_fkey(id, display_name)')
    .or(`user_a.eq.${req.user.id},user_b.eq.${req.user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Start (or fetch, if it already exists) a 1:1 conversation with another
// member. Conversations have no "accept" step — first-contact friction is
// handled client-side by the sender's chosen involvement level, per the
// design doc's "Discovery & first contact" section.
router.post('/', requireAuth, async (req, res) => {
  const { other_user_id } = req.body;
  if (!other_user_id) return res.status(400).json({ error: 'other_user_id is required' });
  if (other_user_id === req.user.id) return res.status(400).json({ error: "Can't start a conversation with yourself" });

  // conversations.user_a < user_b is an enforced ordered pair.
  const [user_a, user_b] = [req.user.id, other_user_id].sort();

  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();

  if (existing) return res.json(existing);

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({ user_a, user_b })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id/messages', requireAuth, async (req, res) => {
  const { convo, error: convoErr } = await getConversationOrFail(req.params.id, req.user.id);
  if (convoErr === 'not_found') return res.status(404).json({ error: 'Conversation not found' });
  if (convoErr === 'forbidden') return res.status(403).json({ error: 'Not a participant in this conversation' });

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', convo.id)
    .order('sent_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// The latest undismissed nudge for a conversation, if any (design doc:
// "Signals & nudging logic" — easy, no-explanation-needed dismissal).
router.get('/:id/nudges', requireAuth, async (req, res) => {
  const { convo, error: convoErr } = await getConversationOrFail(req.params.id, req.user.id);
  if (convoErr === 'not_found') return res.status(404).json({ error: 'Conversation not found' });
  if (convoErr === 'forbidden') return res.status(403).json({ error: 'Not a participant in this conversation' });

  const { data, error } = await supabaseAdmin
    .from('nudges')
    .select('*')
    .eq('conversation_id', convo.id)
    .is('dismissed_at', null)
    .order('sent_at', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0] || null);
});

router.post('/:id/nudges/:nudgeId/dismiss', requireAuth, async (req, res) => {
  const { convo, error: convoErr } = await getConversationOrFail(req.params.id, req.user.id);
  if (convoErr === 'not_found') return res.status(404).json({ error: 'Conversation not found' });
  if (convoErr === 'forbidden') return res.status(403).json({ error: 'Not a participant in this conversation' });

  const { data, error } = await supabaseAdmin
    .from('nudges')
    .update({ dismissed_at: new Date().toISOString(), dismissed_by: req.user.id })
    .eq('id', req.params.nudgeId)
    .eq('conversation_id', convo.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

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

router.post('/:id/messages', requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Message body is required' });
  }

  const { data: convo, error: convoError } = await supabaseAdmin
    .from('conversations')
    .select('id, user_a, user_b')
    .eq('id', req.params.id)
    .single();

  if (convoError || !convo) return res.status(404).json({ error: 'Conversation not found' });
  if (convo.user_a !== req.user.id && convo.user_b !== req.user.id) {
    return res.status(403).json({ error: 'Not a participant in this conversation' });
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({ conversation_id: convo.id, sender_id: req.user.id, body })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Fire-and-forget: check whether this conversation now warrants a soft nudge.
  // Deliberately not awaited on the response path — the nudge is non-urgent.
  sendNudgeIfWarranted(convo.id).catch(() => {});

  res.status(201).json(message);
});

// "Any update?" — the waiting person can ask about planning-session status
// without the app proactively re-prompting the other person (design doc:
// "Identity reveal").
router.get('/:id/planning-status', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('planning_sessions')
    .select('user_a_identity_confirmed, user_b_identity_confirmed, resolved_at')
    .eq('conversation_id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.json({ status: 'not_started' });

  const bothConfirmed = data.user_a_identity_confirmed && data.user_b_identity_confirmed;
  res.json({
    status: data.resolved_at ? 'resolved' : bothConfirmed ? 'unlocked' : 'pending',
  });
});

module.exports = router;
