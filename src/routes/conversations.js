const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { sendNudgeIfWarranted } = require('../services/signals');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .or(`user_a.eq.${req.user.id},user_b.eq.${req.user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

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
