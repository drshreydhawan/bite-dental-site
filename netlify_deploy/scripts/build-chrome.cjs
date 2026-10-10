#!/usr/bin/env node
/**
 * Stamps ONE shared header + footer into every page so they can never drift apart.
 *   edit  scripts/partials/header.html / footer.html  (+ css/site-chrome.css, js/site-chrome.js)
 *   run   node scripts/build-chrome.cjs               (Vercel runs it on every deploy)
 * Pages carry <!--SITE-HEADER-->…<!--/SITE-HEADER--> and <!--SITE-FOOTER-->…<!--/SITE-FOOTER--> markers.
 * First run on an old page migrates it: the legacy <nav>/drawer/<footer> are removed and markers inserted.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const header = fs.readFileSync(path.join(__dirname, 'partials', 'header.html'), 'utf8').trim();
const footer = fs.readFileSync(path.join(__dirname, 'partials', 'footer.html'), 'utf8').trim();
const HS = '<!--SITE-HEADER-->', HE = '<!--/SITE-HEADER-->', FS = '<!--SITE-FOOTER-->', FE = '<!--/SITE-FOOTER-->';
const CSS = '<link rel="stylesheet" href="/css/site-chrome.css">';
const JS = '<script src="/js/site-chrome.js" defer></script>';

function pages() {
  const out = [];
  const walk = (dir, depth) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || ['Resources', 'scripts', 'css', 'js', 'content', 'api', 'admin', 'write', 'node_modules'].includes(e.name)) continue;
      const f = path.join(dir, e.name, 'index.html');
      if (fs.existsSync(f)) out.push(f);
      if (depth < 2) walk(path.join(dir, e.name), depth + 1);
    }
  };
  out.push(path.join(ROOT, 'index.html'));
  walk(ROOT, 0);
  return out;
}

// remove the balanced element that starts at html[start] (an opening tag of `tag`)
function removeBalanced(html, start, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(0, start) + '\u0000' + html.slice(m.index + m[0].length);
  }
  return html;
}

function migrateHeader(html) {
  if (html.includes(HS)) return html;
  let at = -1;
  const nav = html.search(/<nav\b/i);
  if (nav > -1) { html = removeBalanced(html, nav, 'nav'); at = html.indexOf('\u0000'); }
  // legacy standalone drawers
  let d;
  while ((d = html.search(/<div[^>]*\bid="navDrawer"/i)) > -1) {
    const keep = at; html = removeBalanced(html, d, 'div');
    const z = html.indexOf('\u0000'); html = html.replace('\u0000', ''); if (keep > z && z > -1) at = keep - 1; else at = keep;
  }
  if (at === -1) { const b = html.search(/<body[^>]*>/i); const m = html.match(/<body[^>]*>/i); at = b + m[0].length; html = html.slice(0, at) + '\u0000' + html.slice(at); }
  return html.replace('\u0000', `${HS}\n${HE}`);
}

function migrateFooter(html) {
  if (html.includes(FS)) return html;
  const f = html.search(/<footer\b/i);
  if (f > -1) { html = removeBalanced(html, f, 'footer'); return html.replace('\u0000', `${FS}\n${FE}`); }
  const t = html.lastIndexOf('<script src="/js/track.js"');
  const at = t > -1 ? t : html.lastIndexOf('</body>');
  return html.slice(0, at) + `${FS}\n${FE}\n` + html.slice(at);
}

let n = 0;
for (const f of pages()) {
  let h = fs.readFileSync(f, 'utf8');
  const before = h;
  h = migrateHeader(h);
  h = migrateFooter(h);
  h = h.replace(new RegExp(`${HS}[\\s\\S]*?${HE}`), () => `${HS}\n${header}\n${HE}`);
  h = h.replace(new RegExp(`${FS}[\\s\\S]*?${FE}`), () => `${FS}\n${footer}\n${FE}`);
  if (!h.includes('/css/site-chrome.css')) h = h.replace('</head>', `${CSS}\n</head>`);
  if (!h.includes('/js/site-chrome.js')) h = h.replace('</body>', `${JS}\n</body>`);
  if (h !== before) { fs.writeFileSync(f, h); n++; }
}
console.log(`Site chrome: header + footer applied to ${pages().length} pages (${n} changed)`);
