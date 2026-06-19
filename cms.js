/* CMS engine: підтягує тексти й медіа із Supabase і застосовує до сайту */
(function () {
  if (!window.supabase || !window.SB_URL) { return; }
  var sb = window.supabase.createClient(window.SB_URL, window.SB_KEY);

  var PLAY = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='720' height='1280' viewBox='0 0 720 1280'>" +
    "<rect width='100%' height='100%' fill='#0C0E12'/>" +
    "<circle cx='360' cy='640' r='84' fill='none' stroke='#15C9EA' stroke-width='6'/>" +
    "<path d='M336 598 L400 640 L336 682 Z' fill='#15C9EA'/></svg>");

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
    return window.CMS;
  }

  // Медіа головної сторінки: фіксовані слоти (картки продукції, до/після, майстерність)
  function applyHomeMedia() {
    document.querySelectorAll('[data-cms-img]').forEach(function (el) {
      var key = el.getAttribute('data-cms-img');
      var row = window.CMS.gallery.find(function (g) { return g.section && g.section.indexOf('home') === 0 && g.subcategory === key && g.url; });
      if (!row) return; // лишаємо плейсхолдер
      var isBa = (el.className || '').indexOf('ba__img') !== -1;
      if (row.kind === 'video' && !isBa) {
        var v = document.createElement('video');
        v.src = row.url; v.autoplay = true; v.muted = true; v.loop = true;
        v.setAttribute('playsinline', ''); v.setAttribute('preload', 'metadata');
        if (el.className) v.className = el.className;
        if (el.parentNode) el.parentNode.replaceChild(v, el);
      } else {
        el.src = row.url;
      }
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
