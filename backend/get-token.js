require('dotenv').config();
const https = require('https');

function clerkReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.clerk.com',
      path: '/v1' + path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + process.env.CLERK_SECRET_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const session = await clerkReq('POST', '/sessions', {
    user_id: 'user_3Alf6CAvYvJHYAoBpV17grA0s43'
  });
  const token = await clerkReq('POST', '/sessions/' + session.id + '/tokens');
  console.log(token.jwt);
}

main();
