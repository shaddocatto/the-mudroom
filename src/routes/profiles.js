const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Create/complete onboarding profile. First name/nickname only is enough;
// everything else is optional (design doc: "Onboarding & profile").
router.post('/me', requireAuth, async (req, res) => {
  const { display_name, involvement_level, connection_appetite, bio, interests, interests_other, field_visibility } =
    req.body;

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

module.exports = router;
