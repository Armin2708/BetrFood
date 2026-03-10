require('dotenv').config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const postsRouter = require("./routes/posts");
const tagsRouter = require("./routes/tags");
const userRoutes = require("./routes/users");

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
