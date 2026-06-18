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
    return window.CMS;
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

  // Відео-блок «Наші виконані роботи» (секція works)
  function applyWorks() {
    var box = document.getElementById('worksGallery');
    if (!box) return;
    var rows = window.CMS.gallery.filter(function (g) { return g.section === 'works'; });
    if (!rows.length) return; // лишаємо плейсхолдери
    box.innerHTML = '';
    rows.forEach(function (it) {
      var item = document.createElement('div'); item.className = 'vid-item';
      var fr = document.createElement('a'); fr.className = 'vid-frame'; fr.href = it.url; fr.target = '_blank'; fr.rel = 'noopener';
      var img = document.createElement('img'); img.src = it.cover || PLAY; img.alt = it.caption || 'Відео'; fr.appendChild(img);
      var btn = document.createElement('a'); btn.className = 'btn btn--ghost'; btn.href = it.url; btn.target = '_blank'; btn.rel = 'noopener';
      btn.textContent = it.caption || 'Дивитись';
      item.appendChild(fr); item.appendChild(btn); box.appendChild(item);
    });
  }
})();
