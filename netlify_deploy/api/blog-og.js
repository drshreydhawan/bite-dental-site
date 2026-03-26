// Vercel Serverless Function: /api/blog-og?slug=<slug>
// Returns HTML with dynamic OG tags for each blog post
// Used by vercel.json rewrite so /blog/:slug gets proper social previews

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  const slug = req.query.slug || '';

  // Read blog posts JSON
  let posts = [];
  try {
    const jsonPath = path.join(process.cwd(), 'content', 'blog-posts.json');
    const raw = fs.readFileSync(jsonPath, 'utf8');
    posts = JSON.parse(raw).posts || [];
  } catch (e) {
    posts = [];
  }

  const post = posts.find(p => p.slug === slug);

  const title = post
    ? `${post.title} | Bite Dental Clinic`
    : 'Blog | Bite Dental Clinic';
  const description = post
    ? post.excerpt
    : 'Dental tips and insights from our specialist team in Delhi & Gurugram.';
  const image = (post && post.image)
    ? post.image
    : 'https://static.wixstatic.com/media/fe82ed_93334d8bf0274ef48b65d4f2dcf4ff69~mv2.png';
  const url = `https://www.bitedentalclinic.com/blog/${slug}`;

  // Read the post.html template
  let template = '';
  try {
    const tplPath = path.join(process.cwd(), 'blog', 'post.html');
    template = fs.readFileSync(tplPath, 'utf8');
  } catch (e) {
    res.status(500).send('Template not found');
    return;
  }

  // Inject dynamic OG tags right after <head>
  const ogTags = `
  <!-- Dynamic OG tags injected by /api/blog-og -->
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Bite Dental Clinic" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="description" content="${escapeHtml(description)}" />
`;

  // Replace static title tag and inject OG tags
  const html = template
    .replace(/<title>.*?<\/title>/i, '')
    .replace('<head>', '<head>' + ogTags);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(html);
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
