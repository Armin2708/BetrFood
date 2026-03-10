const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ──────────────────────────────────────────────────────────────────
const postsRouter   = require('./routes/posts');
const tagsRouter    = require('./routes/tags');
const feedRouter    = require('./routes/feed');
const usersRouter   = require('./routes/users');
const reportsRouter = require('./routes/reports');

app.use('/api/posts',   postsRouter);
app.use('/api/tags',    tagsRouter);
app.use('/api/feed',    feedRouter);
app.use('/api/users',   usersRouter);
app.use('/api/reports', reportsRouter);
// ────────────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ message: 'BetrFood API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
