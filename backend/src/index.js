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
const pantryRouter = require('./routes/pantry');
const preferencesRouter = require("./routes/preferences");
const blocksRouter = require("./routes/blocks");
const notificationsRouter = require("./routes/notifications");
const chatRouter = require('./routes/chat');
const interactionsRouter = require('./routes/interactions');
const { initializeScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:8081', 'http://localhost:19006'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  // Log block/mute requests immediately when they arrive
  if (req.originalUrl.includes('/block') || req.originalUrl.includes('/mute')) {
    console.log(`\n>>> [INCOMING] ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`);
  }

  const originalSend = res.send.bind(res);
  res.send = function (body) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
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
app.use("/api/users", blocksRouter); // Must be BEFORE userRoutes to avoid /blocked, /muted matching as :id
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
app.use('/api/pantry', pantryRouter);
app.use("/api/preferences", preferencesRouter);
app.use("/api/notifications", notificationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/interactions', interactionsRouter);

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

// Initialize job scheduler (preferences vector updates, etc)
initializeScheduler();

app.listen(PORT, () => {
  console.log(`BetrFood backend listening on port ${PORT}`);
});
