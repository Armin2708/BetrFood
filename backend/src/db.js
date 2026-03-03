const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'posts.json');

function readDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
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
    const ci = allPosts.findIndex(p => p.id === cursor);
    if (ci === -1) return { posts: [], nextCursor: null, hasMore: false };
    startIndex = ci + 1;
  }
  const posts = allPosts.slice(startIndex, startIndex + limit + 1);
  const hasMore = posts.length > limit;
  const resultPosts = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore && resultPosts.length > 0 ? resultPosts[resultPosts.length - 1].id : null;
  return { posts: resultPosts, nextCursor, hasMore };
}

function getPostById(id) { return readDB().find(p => p.id === id) || null; }

function createPost(post) { const posts = readDB(); posts.push(post); writeDB(posts); return post; }

function updatePost(id, updates) {
  const posts = readDB();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  posts[index] = { ...posts[index], ...updates, updatedAt: now, editedAt: now };
  writeDB(posts);
  return posts[index];
}

function deletePost(id) {
  const posts = readDB();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return false;
  posts.splice(index, 1);
  writeDB(posts);
  return true;
}

module.exports = { getAllPosts, getPaginatedPosts, getPostById, createPost, updatePost, deletePost };
