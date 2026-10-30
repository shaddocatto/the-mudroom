const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// NOTE: these endpoints assume a reviewer role check that doesn't exist yet
// at the DB layer (no `role` column on profiles). Add that before relying on
// this in production — flagged here rather than silently trusted.
async function requireReviewer(req, res, next) {
  // TODO: replace with a real reviewer/admin check once roles are modeled.
  // For now this is intentionally unimplemented so it fails closed.
  return res.status(501).json({ error: 'Reviewer auth not yet implemented' });
}

// Shared queue — any reviewer can pick up any pending/uncertain item
// (design doc: "Moderation workflow" — Kristin + one other person, no fixed assignment).
router.get('/queue', requireAuth, requireReviewer, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('status', 'pending')
    .eq('ai_confidence', 'uncertain')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:postId/decide', requireAuth, requireReviewer, async (req, res) => {
  const { decision, notes } = req.body; // decision: 'approved' | 'blocked'
  if (!['approved', 'blocked'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approved' or 'blocked'" });
  }

  const { error: reviewError } = await supabaseAdmin.from('moderation_reviews').insert({
    post_id: req.params.postId,
    reviewer_id: req.user.id,
    decision,
    notes: notes || null,
  });
  if (reviewError) return res.status(500).json({ error: reviewError.message });

  const { data, error } = await supabaseAdmin
    .from('posts')
    .update({
      status: decision === 'approved' ? 'live' : 'blocked',
      live_at: decision === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', req.params.postId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Appeals: require added context, go to AI first (not implemented here — this
// just records the appeal; re-running it through moderation.js is a follow-up).
router.post('/:postId/appeal', requireAuth, async (req, res) => {
  const { context } = req.body;
  if (!context || !context.trim()) {
    return res.status(400).json({ error: 'Appeals require added context, not just a re-review request' });
  }

  const { data, error } = await supabaseAdmin
    .from('appeals')
    .insert({ post_id: req.params.postId, user_id: req.user.id, context })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
