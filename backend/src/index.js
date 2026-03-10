const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
const feedRouter = require('./routes/feed');
app.use('/api/feed', feedRouter);

// Add your other existing routers here, e.g.:
// const postsRouter = require('./routes/posts');
// const tagsRouter  = require('./routes/tags');
// app.use('/api/posts', postsRouter);
// app.use('/api/tags',  tagsRouter);
// ────────────────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ message: "BetrFood API" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
