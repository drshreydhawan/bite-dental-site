// Step 2 of GitHub sign-in: swaps the one-time code for a token and hands it to the editor window.
const SITE = process.env.SITE_URL || 'https://www.bitedentalclinic.com';

function cookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? m[1] : '';
}
const page = (status, message, content) =>
  `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:2rem">${content ? '' : `<p>${message}</p>`}` +
  (content ? `<script>
(function () {
  var site = ${JSON.stringify(SITE)};
  var msg = 'authorization:github:${status}:' + ${JSON.stringify(JSON.stringify(content)).replace(/</g, '\\u003c')};
  function receive(e) {
    if (e.origin !== site) return;
    window.opener.postMessage(msg, e.origin);
    window.removeEventListener('message', receive, false);
    window.close();
  }
  window.addEventListener('message', receive, false);
  window.opener && window.opener.postMessage('authorizing:github', site);
})();
</script>` : '');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const { code, state } = req.query || {};
  if (!code || !state || state !== cookie(req, 'oauth_state')) {
    res.status(400).send(page('error', 'Sign-in could not be verified. Close this window and try again.')); return;
  }
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${SITE}/api/callback` }),
    });
    const data = await r.json();
    if (!data.access_token) { res.status(401).send(page('error', 'GitHub did not approve this sign-in.')); return; }
    res.status(200).send(page('success', '', { token: data.access_token, provider: 'github' }));
  } catch (e) {
    res.status(500).send(page('error', 'Sign-in failed. Please try again.'));
  }
};
