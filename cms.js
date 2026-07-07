/* CMS engine: підтягує тексти й медіа із Supabase і застосовує до сайту */
(function () {
  if (!window.supabase || !window.SB_URL) { return; }
  var sb = window.supabase.createClient(window.SB_URL, window.SB_KEY);

  var PLAY = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='720' height='1280' viewBox='0 0 720 1280'>" +
    "<rect width='100%' height='100%' fill='#0C0E12'/>" +
    "<circle cx='360' cy='640' r='84' fill='none' stroke='#15C9EA' stroke-width='6'/>" +
    "<path d='M336 598 L400 640 L336 682 Z' fill='#15C9EA'/></svg>");

  // Ресайз-проксі: віддає легку стиснену версію важких фото для швидкого завантаження
  // (напр. 24 МБ PNG → ~100 КБ JPG). Відео не чіпаємо. Якщо проксі недоступний — onerror повертає оригінал.
  function cdnImg(url, w) {
    if (!url || typeof url !== 'string' || url.indexOf('images.weserv.nl') !== -1) return url;
    var noproto = url.replace(/^https?:\/\//, '');
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(noproto) + '&w=' + (w || 1000) + '&q=72&output=jpg&we';
  }
  function setImg(el, url, w) {
    if (!el) return;
    el.onerror = function () { el.onerror = null; el.src = url; };
    el.src = cdnImg(url, w);
  }
  window.cdnImg = cdnImg;

  var ready;
  window.CMS = {
    client: sb,
    content: {},
    gallery: [],
    ready: (ready = loadAll())
  };

  async function loadAll() {
    try {
      var rc = await sb.from('site_content').select('key,value');
      (rc.data || []).forEach(function (r) { window.CMS.content[r.key] = r.value; });
      var rg = await sb.from('gallery').select('*').order('position', { ascending: true });
      window.CMS.gallery = rg.data || [];
    } catch (e) { console.warn('CMS load error', e); }
    applyTexts();
    applyWorks();
    applyHomeMedia();
    applyReviews();
    return window.CMS;
  }

  // Гортанка відгуків клієнтів: скріни з секції 'reviews', стрілка → наступний
  function applyReviews() {
    var box = document.querySelector('[data-reviews]');
    if (!box) return;
    var img = box.querySelector('.reviews-img');
    var btn = box.querySelector('.reviews-next');
    var btnPrev = box.querySelector('.reviews-prev');
    var rows = window.CMS.gallery.filter(function (g) { return g.section === 'reviews' && g.kind === 'image' && g.url; });
    rows.sort(function (a, b) { return (b.position || 0) - (a.position || 0); }); // новіші першими
    if (!rows.length) return; // лишаємо плейсхолдер; стрілка лишається видимою
    box.classList.remove('ph'); box.classList.remove('ph--video');
    var i = 0;
    function show(n) { i = (n + rows.length) % rows.length; setImg(img, rows[i].url, 1000); }
    show(0);
    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(i + 1); });
    if (btnPrev) btnPrev.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(i - 1); });
  }

  // Медіа головної сторінки: фіксовані слоти (картки продукції, до/після, майстерність)
  function applyHomeMedia() {
    document.querySelectorAll('[data-cms-img]').forEach(function (el) {
      var key = el.getAttribute('data-cms-img');
      var row = window.CMS.gallery.find(function (g) { return g.section && g.section.indexOf('home') === 0 && g.subcategory === key && g.url; });
      if (!row) return; // лишаємо плейсхолдер
      var isBa = (el.className || '').indexOf('ba__img') !== -1;
      var ph = el.closest ? el.closest('.ph') : null;
      if (row.kind === 'video' && !isBa) {
        var v = document.createElement('video');
        v.muted = true; v.defaultMuted = true; v.autoplay = true; v.loop = true;
        v.setAttribute('muted', ''); v.setAttribute('autoplay', '');
        v.setAttribute('loop', ''); v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', ''); v.setAttribute('preload', 'auto');
        v.controls = false; v.src = row.url;
        if (el.className) v.className = el.className;
        if (el.parentNode) el.parentNode.replaceChild(v, el);
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else {
        setImg(el, row.url, 1000);
      }
      if (ph) { ph.classList.remove('ph'); ph.classList.remove('ph--video'); }
    });
  }

  function applyTexts() {
    var c = window.CMS.content;
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var k = el.getAttribute('data-cms');
      if (c[k] != null && c[k] !== '') el.textContent = c[k];
    });
    document.querySelectorAll('[data-cms-tel]').forEach(function (el) {
      var k = el.getAttribute('data-cms-tel');
      if (c[k]) el.setAttribute('href', 'tel:' + c[k].replace(/[^+\d]/g, ''));
    });
    document.querySelectorAll('[data-cms-mail]').forEach(function (el) {
      var k = el.getAttribute('data-cms-mail');
      if (c[k]) el.setAttribute('href', 'mailto:' + c[k]);
    });
    document.querySelectorAll('[data-cms-viber]').forEach(function (el) {
      var k = el.getAttribute('data-cms-viber');
      if (c[k]) el.setAttribute('href', 'viber://chat?number=' + encodeURIComponent(c[k].replace(/[^+\d]/g, '')));
    });
  }

  // Відео-блок «Наші виконані роботи»: два слоти tiktok / instagram
  function applyWorks() {
    document.querySelectorAll('[data-works-slot]').forEach(function (item) {
      var slot = item.getAttribute('data-works-slot');
      var row = window.CMS.gallery.find(function (g) { return g.section === 'works' && g.subcategory === slot && g.url; });
      if (!row) return; // лишаємо плейсхолдер
      var link = row.link || row.url;
      var frame = item.querySelector('.vid-frame');
      var btn = item.querySelector('a.btn');
      if (frame) {
        frame.setAttribute('href', link);
        frame.innerHTML = '<video src="' + row.url + '" autoplay muted loop playsinline preload="metadata"></video>';
      }
      if (btn) { btn.setAttribute('href', link); if (row.caption) { var lab = btn.querySelector('.btn-label'); if (lab) lab.textContent = row.caption; else btn.textContent = row.caption; } }
    });
  }
})();
