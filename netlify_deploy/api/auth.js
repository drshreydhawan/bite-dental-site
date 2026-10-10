// Step 1 of GitHub sign-in for the blog editor (/admin).
// Needs two Vercel environment variables: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
// (created at GitHub > Settings > Developer settings > OAuth Apps).
const crypto = require('crypto');
const SITE = process.env.SITE_URL || 'https://www.bitedentalclinic.com';

module.exports = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) { res.status(500).send('Editor sign-in is not configured yet (missing GITHUB_CLIENT_ID).'); return; }
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`);
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${SITE}/api/callback`,
    scope: 'repo,user',
    state,
  });
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${qs}` });
  res.end();
};
