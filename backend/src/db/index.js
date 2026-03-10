const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const POSTS_FILE = path.join(dataDir, 'posts.json');

function readPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

function getAllPosts() {
  return readPosts();
}

function getPostById(id) {
  return readPosts().find(p => p.id === id) || null;
}

function createPost(data) {
  const posts = readPosts();
  const now = new Date().toISOString();
  const post = {
    id: randomUUID(),
    userId: data.userId || 'current-user',
    caption: data.caption || '',
    // Images
    imagePath: data.imagePath || '',
    imagePaths: data.imagePaths || [],
    // Video
    videoPath: data.videoPath || null,
    videoType: data.videoType || null,
    // Draft status — drafts are not visible to other users
    isDraft: data.isDraft === true,
    createdAt: now,
    updatedAt: now,
    editedAt: null,
  };
  posts.unshift(post);
  writePosts(posts);
  return post;
}

function updatePost(id, updates) {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return null;
  posts[index] = {
    ...posts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    editedAt: new Date().toISOString(),
  };
  writePosts(posts);
  return posts[index];
}

function deletePost(id) {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return false;
  posts.splice(index, 1);
  writePosts(posts);
  return true;
}

module.exports = { getAllPosts, getPostById, createPost, updatePost, deletePost };
