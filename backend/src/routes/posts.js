const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (extOk && mimeOk) { cb(null, true); }
    else { cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed')); }
  },
});

router.get('/', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const cursor = req.query.cursor || null;
  const result = db.getPaginatedPosts(cursor, limit);
  res.json(result);
});

router.get('/:id', (req, res) => {
  const post = db.getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image is required' });
  const caption = (req.body.caption || '').slice(0, 500);
  const userId = req.body.userId || req.headers['x-user-id'] || 'anonymous';
  const post = {
    id: uuidv4(), userId, caption,
    imagePath: '/uploads/' + req.file.filename,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.createPost(post);
  res.status(201).json(post);
});

router.put('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Missing x-user-id header.' });
  const post = db.getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.userId !== userId) return res.status(403).json({ error: 'Not authorized.' });
  const updates = {};
  if (req.body.caption !== undefined) {
    if (typeof req.body.caption !== 'string') return res.status(400).json({ error: 'Caption must be a string.' });
    updates.caption = req.body.caption.slice(0, 500);
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields.' });
  const updated = db.updatePost(req.params.id, updates);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const userId = req.body.userId || req.headers['x-user-id'];
  const post = db.getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (userId && post.userId !== userId) return res.status(403).json({ error: 'Not authorized' });
  if (post.imagePath) {
    const imgPath = path.join(__dirname, '..', '..', post.imagePath);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  db.deletePost(req.params.id);
  res.json({ message: 'Post deleted successfully' });
});

module.exports = router;
