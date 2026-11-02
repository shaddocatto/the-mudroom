const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Create/complete onboarding profile. First name/nickname only is enough;
// everything else is optional (design doc: "Onboarding & profile").
router.post('/me', requireAuth, async (req, res) => {
  const {
    display_name,
    involvement_level,
    connection_appetite,
    bio,
    interests,
    interests_other,
    field_visibility,
    faith_tradition,
  } = req.body;

  if (!display_name) {
    return res.status(400).json({ error: 'display_name is required' });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: req.user.id,
      display_name,
      involvement_level: involvement_level || 'moderate',
      connection_appetite: connection_appetite || 'small_circle',
      bio: bio || null,
      interests: interests || [],
      interests_other: interests_other || null,
      field_visibility: field_visibility || {},
      faith_tradition: faith_tradition || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

// Kindred Spirits discovery feed. Deliberately NOT a ranked match list (design
// doc: "No public matching algorithm") -- a flat, neutral set of other
// members who are open to signals, ordered by join date rather than any
// score. Interests and bio are included only when their visibility is
// public; display_name is always shown (it's how people address each other).
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, interests, bio, field_visibility, created_at')
    .neq('id', req.user.id)
    .eq('open_to_signals', true)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  const filtered = data.map((p) => {
    const vis = p.field_visibility || {};
    return {
      id: p.id,
      display_name: p.display_name,
      interests: vis.interests ? p.interests : [],
      bio: vis.bio ? p.bio : null,
    };
  });

  res.json(filtered);
});

module.exports = router;
