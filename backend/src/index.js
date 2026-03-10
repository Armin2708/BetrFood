require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded files statically with caching
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  immutable: true,
  etag: true,
  lastModified: true,
}));

// ── Routes ──────────────────────────────────────────────────────────────────
const { router: authRouter } = require('./routes/auth');
const adminRouter   = require('./routes/admin');
const postsRouter   = require('./routes/posts');
const tagsRouter    = require('./routes/tags');
const feedRouter    = require('./routes/feed');
const usersRouter   = require('./routes/users');
const reportsRouter = require('./routes/reports');

app.use('/api/auth',    authRouter);
app.use('/api/admin',   adminRouter);
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
