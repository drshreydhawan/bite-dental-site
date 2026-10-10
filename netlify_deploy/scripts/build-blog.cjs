#!/usr/bin/env node
/**
 * Bite Dental blog builder.
 *
 *   content/blog/*.md  ->  blog/index.html, blog/<slug>/index.html, blog/feed.xml, sitemap.xml (blog block)
 *
 * No npm install needed (marked + js-yaml are vendored in scripts/vendor).
 * Runs automatically on every Vercel deploy (see vercel.json "buildCommand")
 * and can be run by hand:   node scripts/build-blog.cjs
 *
 * Warnings (marked REVIEW / WARN) never block a deploy; ERRORs skip that one post only.
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('./vendor/marked.cjs');
const yaml = require('./vendor/js-yaml.cjs');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.bitedentalclinic.com';
const SRC = path.join(ROOT, 'content', 'blog');
const OUT = path.join(ROOT, 'blog');
const MARK = 'data-generated="blog"';
const DEFAULT_IMAGE = SITE + '/Resources/bite_logo.png';
const GA = 'G-TTHTJXQQ7X';

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'blog-config.json'), 'utf8'));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (u) => (/^https?:\/\//.test(u) ? u : SITE + (u.startsWith('/') ? u : '/' + u));
const log = [];
const note = (lvl, slug, msg) => log.push(`${lvl.padEnd(6)} ${slug}: ${msg}`);

// ---------------------------------------------------------------- read posts
function parsePost(file) {
  const slug = path.basename(file, '.md');
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/^﻿/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { note('ERROR', slug, 'missing --- frontmatter --- block'); return null; }
  let fm;
  try { fm = yaml.load(m[1]) || {}; } catch (e) { note('ERROR', slug, 'frontmatter is not valid: ' + e.message); return null; }
  const body = m[2].trim();
  const toISO = (v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  };
  const post = {
    slug, body,
    title: fm.title && String(fm.title).trim(),
    date: toISO(fm.date),
    updated: toISO(fm.updated),
    tag: fm.tag || 'Oral Health',
    author: fm.author || 'team',
    excerpt: fm.excerpt && String(fm.excerpt).trim(),
    image: fm.image || '',
    imageAlt: fm.image_alt || fm.title || '',
    seoTitle: fm.seo_title || '',
    seoDesc: fm.seo_description || '',
    location: fm.location || 'both',
    draft: fm.draft === true || String(fm.draft).toLowerCase() === 'true',
  };
  if (!post.title) { note('ERROR', slug, 'no title'); return null; }
  if (!post.draft && /\bTODO\b|lorem ipsum|\[\[|XXXX/i.test(body + ' ' + post.title)) { note('ERROR', slug, 'contains TODO/placeholder text — not published. Finish it or tick Draft'); return null; }
  if (!post.date) { note('ERROR', slug, 'no valid date'); return null; }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) note('WARN', slug, 'file name should be lowercase-with-hyphens (it becomes the URL)');
  return post;
}

function lint(p) {
  const seoTitle = p.seoTitle || p.title;
  if (seoTitle.length > 60) note('WARN', p.slug, `title is ${seoTitle.length} chars; Google cuts off after ~60 (set seo_title)`);
  const d = p.seoDesc || p.excerpt || '';
  if (!d) note('WARN', p.slug, 'no excerpt — add a 120-160 character summary');
  else if (d.length < 70 || d.length > 165) note('WARN', p.slug, `summary is ${d.length} chars; aim for 120-160`);
  if (p.image && !p.imageAlt) note('WARN', p.slug, 'hero image has no alt text');
  if (p.image && !/^https?:/.test(p.image) && !fs.existsSync(path.join(ROOT, p.image.replace(/^\//, '')))) note('WARN', p.slug, 'image file not found: ' + p.image);
  if (!p.image) note('WARN', p.slug, 'no hero image (social shares will use the logo)');
  if (!config.authors[p.author]) note('WARN', p.slug, `unknown author "${p.author}"`);
  if (!config.tags[p.tag]) note('WARN', p.slug, `unknown category "${p.tag}" (no treatment link will be shown)`);
  const words = p.body.split(/\s+/).length;
  if (words < 400) note('WARN', p.slug, `only ${words} words; helpful posts that rank are usually 800+`);
  const claims = /(100\s?%|guarantee|best dentist|no\.? ?1\b|#1|cure[sd]?\b|risk[- ]free|no side effects?|completely painless|zero pain)/gi;
  const hit = new Set((p.body + ' ' + p.title).match(claims) || []);
  if (hit.size) note('REVIEW', p.slug, 'absolute/superlative medical wording needs owner sign-off: ' + [...hit].join(', '));
  if (/\b(5,?000\+?|15,?000)\b/.test(p.body)) note('REVIEW', p.slug, 'contains old clinic numbers — approved figures are 3,000+ implants, 1,400+ reviews');
}

// ------------------------------------------------------------------ markdown
function renderMarkdown(body) {
  const toc = [];
  const used = new Set();
  const r = new marked.Renderer();
  r.heading = function (text, depth, raw) {
    const level = Math.max(2, depth); // page already has one <h1>
    let id = String(raw).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    while (used.has(id)) id += '-2';
    used.add(id);
    if (level === 2) toc.push({ id, text: String(raw).replace(/[*_`]/g, '') });
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  };
  r.link = function (href, title, text) {
    const ext = /^https?:\/\//.test(href) && !href.startsWith(SITE);
    return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
  };
  r.image = function (href, title, text) {
    return `<img src="${esc(href)}" alt="${esc(text)}" loading="lazy" decoding="async"${title ? ` title="${esc(title)}"` : ''}>`;
  };
  r.html = function (html) { return esc(typeof html === 'object' && html ? html.text : html); }; // raw HTML in posts is shown as text, never run
  r.table = function (header, bodyHtml) {
    return `<div class="tbl"><table><thead>${header}</thead><tbody>${bodyHtml}</tbody></table></div>`;
  };
  const html = marked.parse(body, { renderer: r, gfm: true, breaks: false });
  return { html, toc };
}

// -------------------------------------------------------------------- layout
const WA = (n, msg) => `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
const TEL_DEL = '+917533951611', TEL_GUR = '+919810664561';

function head({ title, desc, canonical, image, type = 'website', extraLd = [], published, modified }) {
  const ld = extraLd.map((o) => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en" ${MARK}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Bite Dental Clinic">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(image)}">
${published ? `<meta property="article:published_time" content="${published}">\n<meta property="article:modified_time" content="${modified}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="Bite Dental Blog" href="${SITE}/blog/feed.xml">
<link rel="icon" href="/Resources/bite_logo.webp">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/blog/blog.css">
${ld}
</head>`;
}

const NAV = '<!--SITE-HEADER-->\n<!--/SITE-HEADER-->';

const FOOT = `<!--SITE-FOOTER-->
<!--/SITE-FOOTER-->
<div class="mob-cta">
  <a class="mob-wa" data-track="whatsapp" href="${WA('919810664561', "Hi Bite Dental, I'd like to book a consultation.")}" target="_blank" rel="noopener">Book on WhatsApp</a>
  <a class="mob-call" data-track="call" href="tel:${TEL_GUR}">Call</a>
</div>
<script src="/js/track.js" defer></script>`;

function ctaBlock(p) {
  const where = p.location;
  const btn = (cls, track, href, label) => `<a class="${cls}" data-track="${track}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  const msgD = `Hi Team Bite, I read your blog post "${p.title}" and I'd like to book a consultation at Meera Bagh. Please share the earliest slots.`;
  const msgG = `Hi Team Bite, I read your blog post "${p.title}" and I'd like to book a consultation at Gurugram. Please share the earliest slots.`;
  const d = btn('cta-btn', 'whatsapp', WA('917533951611', msgD), 'WhatsApp — Meera Bagh, Delhi');
  const g = btn('cta-btn', 'whatsapp', WA('919810664561', msgG), 'WhatsApp — Sector 51, Gurugram');
  return `<aside class="cta-band">
    <h2>Have a question about your own teeth?</h2>
    <p>Message us to check the earliest available appointment at either clinic.</p>
    <div class="cta-btns">${where === 'delhi' ? d : where === 'gurugram' ? g : d + g}</div>
  </aside>`;
}

function cardHtml(p) {
  const img = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.imageAlt)}" loading="lazy" decoding="async" width="640" height="360">` : '<div class="card-ph" aria-hidden="true">🦷</div>';
  return `<a class="card" href="/blog/${p.slug}" data-tag="${esc(p.tag)}">
    <div class="card-img">${img}</div>
    <div class="card-body">
      <div class="card-tag">${esc(p.tag)}</div>
      <h3 class="card-title">${esc(p.title)}</h3>
      <p class="card-ex">${esc(p.excerpt || '')}</p>
      <div class="card-meta">${fmtDate(p.date)} · ${p.mins} min read</div>
    </div>
  </a>`;
}

const fmtDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// ---------------------------------------------------------------------- build
function build() {
  const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => f.endsWith('.md')) : [];
  const all = files.map(parsePost).filter(Boolean);
  const posts = all.filter((p) => !p.draft).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  const slugs = new Set(posts.map((p) => p.slug));
  const today = new Date().toISOString().slice(0, 10);

  for (const p of posts) {
    p.mins = Math.max(2, Math.round(p.body.split(/\s+/).length / 220));
    if (p.date > today) note('INFO', p.slug, `dated in the future (${p.date}); it is live now — change the date or tick Draft`);
    lint(p);
  }
  all.filter((p) => p.draft).forEach((p) => note('INFO', p.slug, 'draft — not published'));

  // remove stale generated post folders
  for (const d of fs.readdirSync(OUT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const f = path.join(OUT, d.name, 'index.html');
    if (fs.existsSync(f) && fs.readFileSync(f, 'utf8').slice(0, 200).includes(MARK) && !slugs.has(d.name)) {
      fs.rmSync(path.join(OUT, d.name), { recursive: true, force: true });
      note('INFO', d.name, 'removed (post deleted or set to draft)');
    }
  }

  const orgLd = { '@type': 'Organization', '@id': SITE + '/#organization', name: 'Bite Dental Clinic', url: SITE, logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE } };

  // ---- posts
  for (const p of posts) {
    const { html, toc } = renderMarkdown(p.body);
    const author = config.authors[p.author] || config.authors.team;
    const tagInfo = config.tags[p.tag];
    const title = p.seoTitle || `${p.title}`;
    const fullTitle = /Bite Dental/i.test(title) ? title : `${title} | Bite Dental`;
    const desc = p.seoDesc || p.excerpt || p.body.replace(/[#*_>\-|`\[\]()]/g, ' ').replace(/\s+/g, ' ').slice(0, 155);
    const url = `${SITE}/blog/${p.slug}`;
    const image = p.image ? abs(p.image) : DEFAULT_IMAGE;
    const modified = p.updated || p.date;
    const related = posts.filter((x) => x.slug !== p.slug).sort((a, b) => (b.tag === p.tag) - (a.tag === p.tag)).slice(0, 3);

    const ld = [
      {
        '@context': 'https://schema.org', '@type': 'BlogPosting',
        headline: p.title.slice(0, 110), description: desc, image: [image], url,
        datePublished: p.date, dateModified: modified,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: author.url ? { '@type': 'Person', name: author.name, jobTitle: author.role, url: abs(author.url) } : { '@type': 'Organization', name: 'Bite Dental Clinic', url: SITE },
        publisher: orgLd, articleSection: p.tag, inLanguage: 'en-IN',
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog' },
          { '@type': 'ListItem', position: 3, name: p.title, item: url },
        ],
      },
    ];

    const tocHtml = toc.length >= 3 ? `<nav class="toc" aria-label="In this article"><strong>In this article</strong><ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : '';
    const hero = p.image ? `<img class="hero" src="${esc(p.image)}" alt="${esc(p.imageAlt)}" fetchpriority="high" width="1200" height="525">` : '';
    const treat = tagInfo ? `<aside class="treat"><span>Related treatment</span><a href="${tagInfo.href}">${esc(tagInfo.label)} at Bite Dental →</a></aside>` : '';
    const authorBox = `<div class="author"><div class="av" aria-hidden="true">🦷</div><div><h4>${esc(author.name)}</h4><p>${esc(author.role || '')}${author.bio ? ' — ' + esc(author.bio) : ''}</p></div></div>`;

    const page = `${head({ title: fullTitle, desc, canonical: url, image, type: 'article', extraLd: ld, published: p.date, modified })}
<body>
${NAV}
<main>
<article class="post">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/blog">Blog</a> › <span>${esc(p.tag)}</span></nav>
  <div class="post-tag">${esc(p.tag)}</div>
  <h1 class="post-title">${esc(p.title)}</h1>
  <div class="post-meta"><span>By ${esc(author.name)}</span><i></i><time datetime="${p.date}">${fmtDate(p.date)}</time>${p.updated ? `<i></i><span>Updated ${fmtDate(p.updated)}</span>` : ''}<i></i><span>${p.mins} min read</span></div>
  ${hero}
  ${tocHtml}
  <div class="post-content">
${html}
  </div>
  ${treat}
  ${ctaBlock(p)}
  ${authorBox}
</article>
${related.length ? `<section class="more"><h2>More from our blog</h2><div class="grid">${related.map(cardHtml).join('')}</div></section>` : ''}
</main>
${FOOT}
</body>
</html>
`;
    fs.mkdirSync(path.join(OUT, p.slug), { recursive: true });
    fs.writeFileSync(path.join(OUT, p.slug, 'index.html'), page);
  }

  // ---- index
  const tags = [...new Set(posts.map((p) => p.tag))];
  const idxLd = [
    { '@context': 'https://schema.org', '@type': 'Blog', name: 'Bite Dental Blog', url: SITE + '/blog', publisher: orgLd,
      blogPost: posts.slice(0, 20).map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}`, datePublished: p.date })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog' } ] },
  ];
  const index = `${head({
    title: 'Dental Health Blog | Bite Dental Clinic Delhi & Gurugram',
    desc: 'Plain-English advice from our specialist dentists in West Delhi and Gurugram: root canals, implants, aligners, kids dentistry, whitening and preventive care.',
    canonical: SITE + '/blog', image: DEFAULT_IMAGE, extraLd: idxLd })}
<body>
${NAV}
<main>
<header class="hero-idx">
  <span class="pill">Dental tips &amp; insights</span>
  <h1>From our <em>specialist team</em></h1>
  <p>Real advice from our dentists in West Delhi and Gurugram. No jargon, no scare tactics.</p>
</header>
<div class="filters" role="group" aria-label="Filter posts by category">
  <button class="fbtn active" data-tag="all" type="button">All posts</button>
  ${tags.map((t) => `<button class="fbtn" data-tag="${esc(t)}" type="button">${esc(t)}</button>`).join('\n  ')}
</div>
<div class="wrap"><div class="grid" id="grid">
${posts.map(cardHtml).join('\n')}
</div></div>
</main>
${FOOT}
<script>
document.querySelectorAll('.fbtn').forEach(function(b){b.addEventListener('click',function(){
  document.querySelectorAll('.fbtn').forEach(function(x){x.classList.toggle('active',x===b)});
  var t=b.getAttribute('data-tag');
  document.querySelectorAll('#grid .card').forEach(function(c){c.style.display=(t==='all'||c.getAttribute('data-tag')===t)?'':'none'});
});});
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, 'index.html'), index);

  // ---- rss
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Bite Dental Blog</title><link>${SITE}/blog</link>
<description>Dental advice from Bite Dental Clinic, Delhi and Gurugram</description><language>en-IN</language>
${posts.slice(0, 30).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(p.date + 'T06:00:00Z').toUTCString()}</pubDate><description>${esc(p.excerpt || '')}</description></item>`).join('\n')}
</channel></rss>
`;
  fs.writeFileSync(path.join(OUT, 'feed.xml'), rss);

  // ---- sitemap (blog block only; the rest of the file is left alone)
  const smPath = path.join(ROOT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const block = `<!-- BLOG-START (auto-generated by scripts/build-blog.cjs — do not edit) -->
  <url><loc>${SITE}/blog</loc><lastmod>${posts[0] ? posts[0].updated || posts[0].date : today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
${posts.map((p) => `  <url><loc>${SITE}/blog/${p.slug}</loc><lastmod>${p.updated || p.date}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n')}
  <!-- BLOG-END -->`;
  if (sm.includes('<!-- BLOG-START')) sm = sm.replace(/<!-- BLOG-START[\s\S]*?<!-- BLOG-END -->/, block);
  else sm = sm.replace('</urlset>', `  ${block}\n</urlset>`);
  fs.writeFileSync(smPath, sm);

  // ---- homepage "latest posts" strip (static HTML so Google sees the links)
  const homePath = path.join(ROOT, 'index.html');
  let home = fs.readFileSync(homePath, 'utf8');
  if (home.includes('<!-- LATEST-POSTS-START')) {
    const strip = posts.slice(0, 3).map((p) => {
      const bg = p.image ? `<div class="blog-img" style="background-image:url('${esc(p.image)}')" role="img" aria-label="${esc(p.imageAlt)}"></div>` : '<div class="blog-img blog-img-grad"></div>';
      return `<a class="blog-card fade show" href="/blog/${p.slug}">${bg}<div class="blog-body"><div class="blog-meta"><span class="blog-tag">${esc(p.tag)}</span><span class="blog-date">${fmtDate(p.date)}</span></div><h3 class="blog-title">${esc(p.title)}</h3><p class="blog-exc">${esc(p.excerpt || '')}</p><span class="blog-read">Read more →</span></div></a>`;
    }).join('\n      ');
    home = home.replace(/<!-- LATEST-POSTS-START[^>]*-->[\s\S]*?<!-- LATEST-POSTS-END -->/, `<!-- LATEST-POSTS-START (auto-generated by scripts/build-blog.cjs) -->\n      ${strip}\n      <!-- LATEST-POSTS-END -->`);
    fs.writeFileSync(homePath, home);
  }

  // ---- report
  console.log(`Blog build: ${posts.length} published, ${all.length - posts.length} draft/skipped`);
  log.forEach((l) => console.log('  ' + l));
}

build();
