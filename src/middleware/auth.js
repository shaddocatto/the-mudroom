const { supabaseAdmin } = require('../config/supabase');

// Verifies the Supabase JWT sent by the client and attaches the user to req.user.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = data.user;
  next();
}

module.exports = { requireAuth };
