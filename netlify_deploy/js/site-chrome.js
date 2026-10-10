/* Header behaviour: dropdowns, mobile drawer, scroll shadow, active-link highlight. No dependencies. */
(function () {
  var h = document.getElementById('siteHeader');
  if (!h) return;
  var burger = h.querySelector('.bdh-burger'), drawer = document.getElementById('siteDrawer');
  var dds = [].slice.call(h.querySelectorAll('.bdh-dd'));
  function closeDD(except) { dds.forEach(function (d) { if (d !== except) { d.classList.remove('open'); d.querySelector('.bdh-dd-btn').setAttribute('aria-expanded', 'false'); } }); }
  function closeDrawer() { drawer.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); document.documentElement.style.overflow = ''; }
  dds.forEach(function (d) {
    var b = d.querySelector('.bdh-dd-btn');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !d.classList.contains('open');
      closeDD(open ? d : null);
      d.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  });
  burger.addEventListener('click', function () {
    var open = !drawer.classList.contains('open');
    drawer.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.style.overflow = open ? 'hidden' : '';
  });
  document.addEventListener('click', function (e) { if (!h.contains(e.target)) { closeDD(null); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDD(null); closeDrawer(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 1000) closeDrawer(); });
  function onScroll() { h.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // highlight where you are
  var path = location.pathname.replace(/\/+$/, '') || '/';
  [].slice.call(h.querySelectorAll('.bdh-nav a, .bdh-menu a')).forEach(function (a) {
    var p = (a.getAttribute('href') || '').replace(/\/+$/, '') || '/';
    if (p === '/' ) return;
    if (path === p || (p === '/blog' && path.indexOf('/blog') === 0)) {
      a.setAttribute('aria-current', 'page');
      var dd = a.closest('.bdh-dd'); if (dd) dd.querySelector('.bdh-dd-btn').setAttribute('aria-current', 'true');
    }
  });
})();
