require('dotenv').config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const postsRouter = require("./routes/posts");
const tagsRouter = require("./routes/tags");
const userRoutes = require("./routes/users");
const recipesRouter = require("./routes/recipes");
const profilesRouter = require("./routes/profiles");
const adminRouter = require("./routes/admin");
const rolesRouter = require("./routes/roles");
const authRouter = require("./routes/auth");
const likesRouter = require("./routes/likes");
const commentsRouter = require("./routes/comments");
const reportsRouter = require("./routes/reports");
const collectionsRouter = require("./routes/collections");
const savesRouter = require("./routes/saves");
const preferencesRouter = require("./routes/preferences");
const blocksRouter = require("./routes/blocks");
const notificationsRouter = require("./routes/notifications");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const hasAuth = !!req.headers.authorization;
  console.log(`\n[REQ] --> ${req.method} ${req.originalUrl} | auth: ${hasAuth}`);

  const originalSend = res.send.bind(res);
  res.send = function (body) {
    const duration = Date.now() - start;
    console.log(`[RES] <-- ${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms`);
    if (res.statusCode >= 400) {
      console.log(`[RES] Error body:`, typeof body === 'string' ? body.substring(0, 500) : body);
    }
    return originalSend(body);
  };

  next();
});

// Serve uploaded media (images + videos) statically with caching
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  acceptRanges: true, // Required for video seeking/streaming
}));

app.get("/", (req, res) => {
  res.json({ message: "BetrFood API" });
});

// Mount routes
app.use("/api/posts", postsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/users", userRoutes);
app.use("/api", recipesRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/auth", authRouter);
app.use("/api/posts", likesRouter);
app.use("/api/posts", commentsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/posts", savesRouter);
app.use("/api/preferences", preferencesRouter);
app.use("/api/users", blocksRouter);
app.use("/api/notifications", notificationsRouter);

// Auto-migrate: ensure media_type column exists on posts table
// Global error handler — catches multer errors and other unhandled middleware errors
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large.' });
  }
  if (err.message && err.message.includes('Only')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

const supabase = require("./db/supabase");
(async () => {
  try {
    // Check if media_type column exists by querying a single post
    const { data, error } = await supabase.from('posts').select('media_type').limit(1);
    if (error && error.message.includes('media_type')) {
      console.log('[Migration] Adding media_type column to posts...');
      await supabase.rpc('exec_sql', {
        query: "ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';"
      });
      console.log('[Migration] media_type column added.');
    } else {
      console.log('[Migration] media_type column already exists.');
    }
  } catch (err) {
    console.error('[Migration] Failed to check/add media_type column:', err.message);
  }
})();

app.listen(PORT, () => {
  console.log(`\n=== BetrFood Backend Started ===`);
  console.log(`Port: ${PORT}`);
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ set' : '✗ MISSING'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ set' : '✗ MISSING'}`);
  console.log(`CLERK_SECRET_KEY: ${process.env.CLERK_SECRET_KEY ? '✓ set' : '✗ MISSING'}`);
  console.log(`CLERK_PUBLISHABLE_KEY: ${process.env.CLERK_PUBLISHABLE_KEY ? '✓ set' : '✗ MISSING'}`);
  console.log(`================================\n`);
});
