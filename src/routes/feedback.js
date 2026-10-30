const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Deliberately scoped to the app's own performance only — never asks about
// the relationship/friendship itself (design doc: "Post-meetup & ongoing role").
router.post('/:conversationId', requireAuth, async (req, res) => {
  const { nudge_quality, spot_quality, open_feedback } = req.body;

  const { data, error } = await supabaseAdmin
    .from('meetup_feedback')
    .insert({
      conversation_id: req.params.conversationId,
      user_id: req.user.id,
      nudge_quality: nudge_quality ?? null,
      spot_quality: spot_quality ?? null,
      open_feedback: open_feedback || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// User-confirmed reset to "open to new signals" — deliberately NOT automatic,
// to minimize any chance the person blames the app for a surfaced match they
// didn't ask for (design doc: "Open questions" resolution, Oct 30).
router.post('/:conversationId/reopen-to-new-signals', requireAuth, async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({ open_to_signals: true })
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(profile);
});

module.exports = router;
