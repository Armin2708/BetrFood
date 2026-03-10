const express = require("express");
const db = require("../db/database");

const router = express.Router();

function initializeFollowTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_follows (
      followerId TEXT NOT NULL,
      followingId TEXT NOT NULL,
      PRIMARY KEY (followerId, followingId)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_follows_followerId
    ON user_follows(followerId)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_follows_followingId
    ON user_follows(followingId)
  `);
}

initializeFollowTable();

// POST /api/users/:id/follow
router.post("/:id/follow", (req, res) => {
  const followingId = req.params.id;
  const { followerId } = req.body;

  if (!followerId) {
    return res.status(400).json({ error: "followerId is required." });
  }

  if (followerId === followingId) {
    return res.status(400).json({ error: "Users cannot follow themselves." });
  }

  try {
    const result = db
      .prepare(`
        INSERT OR IGNORE INTO user_follows (followerId, followingId)
        VALUES (?, ?)
      `)
      .run(followerId, followingId);

    if (result.changes === 0) {
      return res.status(409).json({ error: "Already following this user." });
    }

    res.json({
      message: "User followed successfully.",
      followerId,
      followingId,
    });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ error: "Failed to follow user." });
  }
});

// DELETE /api/users/:id/follow
router.delete("/:id/follow", (req, res) => {
  const followingId = req.params.id;
  const { followerId } = req.body;

  if (!followerId) {
    return res.status(400).json({ error: "followerId is required." });
  }

  try {
    const result = db
      .prepare(`
        DELETE FROM user_follows
        WHERE followerId = ? AND followingId = ?
      `)
      .run(followerId, followingId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Follow relationship not found." });
    }

    res.json({
      message: "User unfollowed successfully.",
      followerId,
      followingId,
    });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ error: "Failed to unfollow user." });
  }
});

// GET /api/users/:id/follow-stats
router.get("/:id/follow-stats", (req, res) => {
  const userId = req.params.id;

  try {
    const followerRow = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM user_follows
        WHERE followingId = ?
      `)
      .get(userId);

    const followingRow = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM user_follows
        WHERE followerId = ?
      `)
      .get(userId);

    res.json({
      userId,
      followerCount: followerRow.count,
      followingCount: followingRow.count,
    });
  } catch (error) {
    console.error("Error fetching follow stats:", error);
    res.status(500).json({ error: "Failed to fetch follow stats." });
  }
});

module.exports = router;
