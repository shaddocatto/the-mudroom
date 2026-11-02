require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const profilesRouter = require('./src/routes/profiles');
const conversationsRouter = require('./src/routes/conversations');
const planningRouter = require('./src/routes/planning');
const postsRouter = require('./src/routes/posts');
const moderationRouter = require('./src/routes/moderation');
const feedbackRouter = require('./src/routes/feedback');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/profiles', profilesRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/planning', planningRouter);
app.use('/api/posts', postsRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/feedback', feedbackRouter);

// Serve the built frontend (web/ -> ../public via Vite's build.outDir) and
// fall back to index.html for client-side routes, without shadowing the
// API or health-check routes above.
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') return next();
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) next(); // no build yet -- fall through to 404
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`The Mudroom backend listening on port ${port}`);
});

module.exports = app;
