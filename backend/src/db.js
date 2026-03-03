const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'posts.json');

function readDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
  if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2)); }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

function getAllPosts() {
  return readDB().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getPaginatedPosts(cursor, limit) {
  const allPosts = getAllPosts();
  let startIndex = 0;
  if (cursor) {
    const idx = allPosts.findIndex(p => p.id === cursor);
    if (idx === -1) return { posts: [], nextCursor: null, hasMore: false };
    startIndex = idx + 1;
  }
  const slice = allPosts.slice(startIndex, startIndex + limit + 1);
  const hasMore = slice.length > limit;
  const posts = hasMore ? slice.slice(0, limit) : slice;
  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null;
  return { posts, nextCursor, hasMore };
}

function getPostById(id) { return readDB().find(p => p.id === id) || null; }

function createPost(post) { const posts = readDB(); posts.push(post); writeDB(posts); return post; }

function updatePost(id, updates) {
  const posts = readDB();
  const i = posts.findIndex(p => p.id === id);
  if (i === -1) return null;
  const now = new Date().toISOString();
  posts[i] = { ...posts[i], ...updates, updatedAt: now, editedAt: now };
  writeDB(posts);
  return posts[i];
}

function deletePost(id) {
  const posts = readDB();
  const i = posts.findIndex(p => p.id === id);
  if (i === -1) return false;
  posts.splice(i, 1);
  writeDB(posts);
  return true;
}

module.exports = { getAllPosts, getPaginatedPosts, getPostById, createPost, updatePost, deletePost };
