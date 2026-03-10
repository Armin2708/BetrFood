const https = require('https');
const http = require('http');

function clerkBackend(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.clerk.com',
      path: '/v1' + apiPath,
      method,
      headers: {
        'Authorization': 'Bearer sk_test_UaUfTlNNFo6zvhCL8Z2iE7QxCpX8lwCCr4qE4PwdiB',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function api(method, apiPath, body, token, isForm) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let data;
    if (isForm) {
      const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
      headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
      const jpeg = Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xff,0xd9]);
      let parts = '--' + boundary + '\r\nContent-Disposition: form-data; name="image"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n';
      let captionPart = '\r\n--' + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + (body?.caption || 'test') + '\r\n--' + boundary + '--\r\n';
      data = Buffer.concat([Buffer.from(parts), jpeg, Buffer.from(captionPart)]);
      headers['Content-Length'] = data.length;
    } else if (body) {
      data = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }

    const url = new URL('http://localhost:3000' + apiPath);
    const req = http.request({
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method, headers
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passed = 0, failed = 0;
function check(name, condition) {
  if (condition) { passed++; console.log('  PASS'); }
  else { failed++; console.log('  FAIL'); }
}

async function main() {
  const userId = 'user_3Alf6CAvYvJHYAoBpV17grA0s43';

  console.log('=== Getting fresh Clerk token ===');
  const session = await clerkBackend('POST', '/sessions', { user_id: userId });
  const tokenResult = await clerkBackend('POST', '/sessions/' + session.id + '/tokens');
  const TOKEN = tokenResult.jwt;
  console.log('Token acquired.\n');

  let r, postId;

  // 1
  console.log('TEST 1: Health Check');
  r = await api('GET', '/');
  console.log('  Status:', r.status);
  check('health', r.status === 200);

  // 2
  console.log('TEST 2: Get All Tags (24)');
  r = await api('GET', '/api/tags');
  console.log('  Count:', r.data.length);
  check('tags', r.status === 200 && r.data.length === 24);

  // 3
  console.log('TEST 3: Filter Tags by Type');
  r = await api('GET', '/api/tags?type=meal');
  console.log('  Meal tags:', r.data.length);
  check('meal-tags', r.status === 200 && r.data.length === 6);

  // 4
  console.log('TEST 4: Get Posts (empty)');
  r = await api('GET', '/api/posts');
  console.log('  Posts:', r.data.posts?.length);
  check('empty-feed', r.status === 200 && r.data.posts?.length === 0);

  // 5
  console.log('TEST 5: Create Post - No Auth (401)');
  r = await api('POST', '/api/posts', { caption: 'x' }, null, true);
  console.log('  Status:', r.status);
  check('no-auth-create', r.status === 401);

  // 6
  console.log('TEST 6: Create Post - With Auth');
  r = await api('POST', '/api/posts', { caption: 'My first BetrFood post!' }, TOKEN, true);
  console.log('  Status:', r.status, '| id:', r.data?.id?.substring(0,8));
  postId = r.data?.id;
  check('create-post', r.status === 201 && Boolean(postId));

  // 7
  console.log('TEST 7: Get Posts (1 post)');
  r = await api('GET', '/api/posts');
  console.log('  Count:', r.data.posts?.length);
  check('one-post', r.status === 200 && r.data.posts?.length === 1);

  // 8
  console.log('TEST 8: Get Single Post');
  r = await api('GET', '/api/posts/' + postId);
  console.log('  Caption:', r.data.caption, '| userId:', r.data.userId?.substring(0,15));
  check('single-post', r.status === 200 && r.data.userId === userId);

  // 9
  console.log('TEST 9: Update Post - No Auth (401)');
  r = await api('PUT', '/api/posts/' + postId, { caption: 'hack' });
  console.log('  Status:', r.status);
  check('no-auth-update', r.status === 401);

  // 10
  console.log('TEST 10: Update Post - With Auth');
  r = await api('PUT', '/api/posts/' + postId, { caption: 'Updated caption!' }, TOKEN);
  console.log('  Caption:', r.data.caption, '| editedAt:', Boolean(r.data.editedAt));
  check('update-post', r.status === 200 && r.data.caption === 'Updated caption!' && Boolean(r.data.editedAt));

  // 11
  console.log('TEST 11: Add Tags to Post');
  r = await api('POST', '/api/tags/posts/' + postId + '/tags', { tagIds: [1, 13, 17] }, TOKEN);
  console.log('  Tags:', r.data.tags?.map(t=>t.name).join(', '));
  check('add-tags', r.status === 200 && r.data.tags?.length === 3);

  // 12
  console.log('TEST 12: Get Post Tags');
  r = await api('GET', '/api/tags/posts/' + postId + '/tags');
  const tagNames = Array.isArray(r.data) ? r.data.map(t=>t.name).join(', ') : 'N/A';
  console.log('  Tags:', tagNames);
  check('get-tags', r.status === 200 && Array.isArray(r.data) && r.data.length === 3);

  // 13
  console.log('TEST 13: Filter Posts by Tags');
  r = await api('GET', '/api/tags/posts/by-tags?tags=1,13');
  console.log('  Matching:', r.data?.length);
  check('filter-tags', r.status === 200 && r.data.length === 1);

  // 14
  console.log('TEST 14: Remove Tag from Post');
  r = await api('DELETE', '/api/tags/posts/' + postId + '/tags/17');
  console.log('  Status:', r.status);
  check('remove-tag', r.status === 200);

  // 15
  console.log('TEST 15: Verify Tag Removed');
  r = await api('GET', '/api/tags/posts/' + postId + '/tags');
  console.log('  Tags left:', r.data?.length);
  check('tag-removed', r.data?.length === 2);

  // 16
  console.log('TEST 16: Follow User');
  r = await api('POST', '/api/users/other-user-123/follow', {}, TOKEN);
  console.log('  Status:', r.status);
  check('follow', r.status === 200);

  // 17
  console.log('TEST 17: Follow Stats');
  r = await api('GET', '/api/users/' + userId + '/follow-stats');
  console.log('  Following:', r.data.followingCount, '| Followers:', r.data.followerCount);
  check('follow-stats', r.data.followingCount === 1);

  // 18
  console.log('TEST 18: Duplicate Follow (409)');
  r = await api('POST', '/api/users/other-user-123/follow', {}, TOKEN);
  console.log('  Status:', r.status);
  check('dup-follow', r.status === 409);

  // 19
  console.log('TEST 19: Unfollow User');
  r = await api('DELETE', '/api/users/other-user-123/follow', {}, TOKEN);
  console.log('  Status:', r.status);
  check('unfollow', r.status === 200);

  // 20
  console.log('TEST 20: Follow Stats After Unfollow');
  r = await api('GET', '/api/users/' + userId + '/follow-stats');
  console.log('  Following:', r.data.followingCount);
  check('unfollow-stats', r.data.followingCount === 0);

  // 21
  console.log('TEST 21: Delete Post - No Auth (401)');
  r = await api('DELETE', '/api/posts/' + postId);
  console.log('  Status:', r.status);
  check('no-auth-delete', r.status === 401);

  // 22
  console.log('TEST 22: Delete Post - With Auth');
  r = await api('DELETE', '/api/posts/' + postId, {}, TOKEN);
  console.log('  Status:', r.status);
  check('delete-post', r.status === 200);

  // 23
  console.log('TEST 23: Verify Post Deleted (404)');
  r = await api('GET', '/api/posts/' + postId);
  console.log('  Status:', r.status);
  check('post-gone', r.status === 404);

  // 24
  console.log('TEST 24: Pagination');
  const p1 = await api('POST', '/api/posts', { caption: 'Post 1' }, TOKEN, true);
  const p2 = await api('POST', '/api/posts', { caption: 'Post 2' }, TOKEN, true);
  const p3 = await api('POST', '/api/posts', { caption: 'Post 3' }, TOKEN, true);
  r = await api('GET', '/api/posts?limit=2');
  const page1Count = r.data.posts?.length;
  const hasMore = r.data.hasMore;
  const cursor = r.data.nextCursor;
  r = await api('GET', '/api/posts?limit=2&cursor=' + cursor);
  const page2Count = r.data.posts?.length;
  console.log('  Page1:', page1Count, '| Page2:', page2Count, '| hasMore:', hasMore);
  check('pagination', page1Count === 2 && hasMore === true && page2Count === 1);

  // Cleanup
  await api('DELETE', '/api/posts/' + p1.data?.id, {}, TOKEN);
  await api('DELETE', '/api/posts/' + p2.data?.id, {}, TOKEN);
  await api('DELETE', '/api/posts/' + p3.data?.id, {}, TOKEN);

  console.log('\n=============================');
  console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed out of ' + (passed + failed));
  console.log('=============================');
}

main().catch(e => console.error('FATAL:', e));
