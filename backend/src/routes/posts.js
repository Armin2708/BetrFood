const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }); }

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => { cb(null, `${uuidv4()}${path.extname(file.originalname)}`); },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

router.get('/', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const cursor = req.query.cursor || null;
  res.json(db.getPaginatedPosts(cursor, limit));
});

router.get('/:id', (req, res) => {
  const post = db.getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image is required' });
  const post = {
    id: uuidv4(),
    userId: req.body.userId || req.headers['x-user-id'] || 'anonymous',
    caption: (req.body.caption || '').slice(0, 500),
    imagePath: `/uploads/${req.file.filename}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.createPost(post);
  res.status(201).json(post);
});

router.put('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const post = db.getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.userId !== userId) return res.status(403).json({ error: 'Not authorized.' });
  const updates = {};
  if (req.body.caption !== undefined) updates.caption = String(req.body.caption).slice(0, 500);
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update.' });
  res.json(db.updatePost(req.params.id, updates));
});

router.delete('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const post = db.getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.userId !== userId) return res.status(403).json({ error: 'Not authorized.' });
  if (post.imagePath) {
    const p = path.join(__dirname, '..', '..', post.imagePath);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.deletePost(req.params.id);
  res.json({ message: 'Post deleted successfully.' });
});

module.exports = router;
