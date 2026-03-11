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

// Serve uploaded images statically with caching
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
  maxAge: '7d',
  immutable: true,
  etag: true,
  lastModified: true,
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
