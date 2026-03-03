const express = require("express");
const cors = require("cors");
const path = require("path");
const postsRouter = require("./routes/posts");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "BetrFood API" });
});

// Mount routes
app.use("/api/posts", postsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
