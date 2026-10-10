// POST /api/submit-post  — receives a blog draft from /write and opens a GitHub pull request.
// Nothing goes live until the owner merges that pull request.
//
// Vercel environment variables (Settings > Environment Variables):
//   BLOG_UPLOAD_PASSWORD  the shared password for /write
//   GITHUB_TOKEN          fine-grained token: this repo only, Contents + Pull requests = Read & write
//   GITHUB_REPO           optional, default drshreydhawan/bite-dental-site
//   BLOG_CONTENT_DIR      optional, default netlify_deploy/content/blog
//   BLOG_IMAGE_DIR        optional, default netlify_deploy/Resources/blog
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'drshreydhawan/bite-dental-site';
const CONTENT_DIR = (process.env.BLOG_CONTENT_DIR || 'netlify_deploy/content/blog').replace(/\/+$/, '');
const IMAGE_DIR = (process.env.BLOG_IMAGE_DIR || 'netlify_deploy/Resources/blog').replace(/\/+$/, '');
const AUTHORS = ['shrey', 'shamindhi', 'achla', 'aman', 'team'];
const LOCATIONS = ['both', 'delhi', 'gurugram'];
const TAGS = ['Root Canal', 'Dental Implants', 'Clear Aligners', 'Orthodontics', 'Cosmetic Dentistry', 'Teeth Whitening', 'Crowns & Bridges', 'Kids Dentistry', 'Preventive Care', 'Emergency', 'International Patients', 'Oral Health'];

const attempts = new Map(); // best-effort throttle (per warm instance)
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const bad = (res, code, message) => res.status(code).json({ ok: false, message });

function slugify(title) {
  return title.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
}
function imageType(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.length > 12 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'bite-dental-blog-submit' },
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!r.ok && !(opts.allow404 && r.status === 404)) throw new Error(`GitHub ${r.status} ${path}: ${(json && json.message) || text.slice(0, 120)}`);
  return { status: r.status, json };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return bad(res, 405, 'Use the form at /write.');
  if (!process.env.BLOG_UPLOAD_PASSWORD || !process.env.GITHUB_TOKEN) return bad(res, 503, 'The upload form is not configured yet. Ask the site owner to finish setup.');

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const rec = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (rec.length >= 8) return bad(res, 429, 'Too many tries. Please wait 15 minutes and try again.');

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = null; } }
  if (!b || typeof b !== 'object') return bad(res, 400, 'Could not read the form. Please reload the page and try again.');

  const okPw = crypto.timingSafeEqual(sha(b.password || ''), sha(process.env.BLOG_UPLOAD_PASSWORD));
  if (!okPw) { rec.push(now); attempts.set(ip, rec); await sleep(1200); return bad(res, 401, 'That password is not right.'); }

  const f = {
    name: clean(b.name, 60), title: clean(b.title, 110), tag: clean(b.tag, 40), author: clean(b.author, 20), location: clean(b.location, 10),
    excerpt: clean(b.excerpt, 400).replace(/\s+/g, ' '), imageAlt: clean(b.imageAlt, 160), body: String(b.body || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim(),
  };
  if (f.name.length < 2) return bad(res, 400, 'Please enter your name.');
  if (f.title.length < 10) return bad(res, 400, 'The title is too short (at least 10 characters).');
  if (!TAGS.includes(f.tag)) return bad(res, 400, 'Please choose a category.');
  if (!AUTHORS.includes(f.author)) return bad(res, 400, 'Please choose who wrote or reviewed the article.');
  if (!LOCATIONS.includes(f.location)) f.location = 'both';
  if (f.excerpt.length < 70 || f.excerpt.length > 165) return bad(res, 400, `The summary must be 70-165 characters (it is ${f.excerpt.length}).`);
  if (f.body.length < 1500) return bad(res, 400, 'The article is too short. Posts that help patients (and rank) need at least ~300 words.');
  if (f.body.length > 60000) return bad(res, 400, 'The article is too long for this form.');
  if (b.confirm !== true) return bad(res, 400, 'Please tick the confirmation box.');

  let img = null;
  if (b.image && b.image.data) {
    const buf = Buffer.from(String(b.image.data), 'base64');
    if (buf.length > 1_800_000) return bad(res, 400, 'The image is too large (max about 1.8 MB).');
    const ext = imageType(buf);
    if (!ext) return bad(res, 400, 'The image must be a JPG, PNG or WebP file.');
    img = { buf, ext };
    if (!f.imageAlt) return bad(res, 400, 'Please describe the image in a few words.');
  }

  try {
    const repo = (await gh(`/repos/${REPO}`)).json;
    const base = repo.default_branch;
    const head = (await gh(`/repos/${REPO}/git/ref/heads/${base}`)).json.object.sha;

    let slug = slugify(f.title) || 'post';
    if (['index', 'feed', 'blog'].includes(slug)) slug += '-post';
    const exists = async (p) => (await gh(`/repos/${REPO}/contents/${p}?ref=${base}`, { allow404: true })).status === 200;
    if (await exists(`${CONTENT_DIR}/${slug}.md`)) slug += '-' + new Date().toISOString().slice(0, 10);

    const branch = `blog/${slug}-${Date.now().toString(36)}`;
    await gh(`/repos/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: head }) });

    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    let imagePath = '';
    if (img) {
      imagePath = `${IMAGE_DIR}/${slug}.${img.ext}`;
      await gh(`/repos/${REPO}/contents/${imagePath}`, { method: 'PUT', body: JSON.stringify({ message: `Blog image: ${slug}`, content: img.buf.toString('base64'), branch }) });
    }
    const siteImage = imagePath ? '/Resources/blog/' + imagePath.split('/').pop() : '';
    const fm = ['---', `title: ${JSON.stringify(f.title)}`, `date: ${date}`, `tag: ${JSON.stringify(f.tag)}`, `author: ${f.author}`, `location: ${f.location}`, `excerpt: ${JSON.stringify(f.excerpt)}`];
    if (siteImage) fm.push(`image: ${JSON.stringify(siteImage)}`, `image_alt: ${JSON.stringify(f.imageAlt)}`);
    fm.push('draft: false', '---', '');
    const md = fm.join('\n') + f.body + '\n';
    await gh(`/repos/${REPO}/contents/${CONTENT_DIR}/${slug}.md`, { method: 'PUT', body: JSON.stringify({ message: `Blog submission: ${f.title}`, content: Buffer.from(md).toString('base64'), branch }) });

    const words = f.body.split(/\s+/).length;
    const pr = (await gh(`/repos/${REPO}/pulls`, { method: 'POST', body: JSON.stringify({
      title: `Blog submission: ${f.title}`, head: branch, base,
      body: `**Submitted by:** ${f.name}\n**Category:** ${f.tag} · **Author shown:** ${f.author} · **Clinic buttons:** ${f.location}\n**Length:** ~${words} words\n**URL if merged:** /blog/${slug}\n\n### Reviewer checklist\n- [ ] Clinically accurate and signed off by a doctor\n- [ ] Prices match the approved price sheet\n- [ ] No patient names / photos without written consent\n- [ ] No superlatives or guarantees ("best", "100% painless")\n- [ ] Vercel preview looks right\n\n**Merging this pull request publishes the post.** Close it to reject.`,
    }) })).json;

    rec.push(now); attempts.set(ip, rec);
    return res.status(200).json({ ok: true, message: 'Thank you! Your post was sent for review. It goes live after the owner approves it.', ref: pr.number });
  } catch (e) {
    console.error('submit-post failed:', e.message);
    return bad(res, 502, 'Something went wrong while sending your post. Please try again in a minute, or send it to the owner directly.');
  }
};
