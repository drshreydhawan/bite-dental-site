/* Bite Dental conversion tracking — loads on every page (defer).
 * Sends GA4 events for the actions that actually become appointments:
 *   whatsapp_click, phone_click, directions_click, form_submit
 * Also fires Meta Pixel "Contact"/"Lead" and Google Ads conversions IF those
 * tags are installed (they are skipped safely when not).
 * Mark custom buttons with  data-track="whatsapp|call|directions"  if needed. */
(function () {
  function where(a) {
    var h = (a.getAttribute('href') || '').toLowerCase();
    if (/917533951611|7533951611/.test(h)) return 'meera_bagh';
    if (/919810664561|9810664561/.test(h)) return 'gurugram';
    return 'unknown';
  }
  function kind(a) {
    var t = a.getAttribute('data-track');
    if (t) return t;
    var h = (a.getAttribute('href') || '').toLowerCase();
    if (h.indexOf('wa.me/') > -1 || h.indexOf('api.whatsapp.com') > -1) return 'whatsapp';
    if (h.indexOf('tel:') === 0) return 'call';
    if (/maps\.app\.goo\.gl|google\.[a-z.]+\/maps|g\.co\/kgs|goo\.gl\/maps/.test(h)) return 'directions';
    return null;
  }
  var EVENT = { whatsapp: 'whatsapp_click', call: 'phone_click', directions: 'directions_click' };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var k = kind(a);
    if (!k) return;
    var params = { clinic: where(a), page_path: location.pathname, link_text: (a.textContent || '').trim().slice(0, 60) };
    try { if (window.gtag) gtag('event', EVENT[k], params); } catch (_) {}
    try {
      if (window.fbq && (k === 'whatsapp' || k === 'call')) fbq('track', 'Contact', { clinic: params.clinic });
    } catch (_) {}
  }, true);
  document.addEventListener('submit', function (e) {
    try {
      if (window.gtag) gtag('event', 'form_submit', { form_id: (e.target && e.target.id) || 'form', page_path: location.pathname });
      if (window.fbq) fbq('track', 'Lead');
    } catch (_) {}
  }, true);
})();
