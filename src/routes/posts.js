const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { moderatePost } = require('../services/moderation');

const router = express.Router();

const UNDO_WINDOW_MS = 5000;

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, author_id, body, status, created_at, live_at')
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Pre-screening pipeline (design doc: "Moderation workflow").
router.post('/', requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Post body is required' });
  }

  const moderation = await moderatePost(body);

  if (moderation.verdict === 'confident_violation') {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        author_id: req.user.id,
        body,
        status: 'blocked',
        ai_confidence: moderation.verdict,
        block_reason: moderation.reason,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(403).json({
      error: `This didn't meet our guidelines because ${moderation.reason}.`,
      guidelines_url: '/guidelines',
      post: data,
    });
  }

  // Both 'confident_clean' and 'uncertain' start as "pending" — the label never
  // changes to "posting", only the wait time differs (design doc: never show
  // motion that hasn't happened).
  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      author_id: req.user.id,
      body,
      status: 'pending',
      ai_confidence: moderation.verdict,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (moderation.verdict === 'confident_clean') {
    // Goes live after a short undo window.
    setTimeout(async () => {
      await supabaseAdmin
        .from('posts')
        .update({ status: 'live', live_at: new Date().toISOString() })
        .eq('id', data.id)
        .eq('status', 'pending'); // no-op if the author undid it
    }, UNDO_WINDOW_MS);
  }
  // 'uncertain' posts just sit as 'pending' until a human reviewer acts
  // (see moderation.js routes).

  res.status(201).json({ post: data, undo_window_ms: moderation.verdict === 'confident_clean' ? UNDO_WINDOW_MS : null });
});

router.delete('/:id/undo', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', req.params.id)
    .eq('author_id', req.user.id)
    .eq('status', 'pending')
    .select();

  if (error) return res.status(500).json({ error: error.message });
  if (!data.length) return res.status(404).json({ error: 'Nothing to undo' });
  res.json({ undone: true });
});

module.exports = router;
