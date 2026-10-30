require('dotenv').config();
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`The Mudroom backend listening on port ${port}`);
});

module.exports = app;
