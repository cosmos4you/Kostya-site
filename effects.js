/* ============================================================
   effects.js — итерация 6
   1) Параллакс фона ТОЛЬКО по вертикали (без сдвига вбок мышью)
   2) Небо: облака + лёгкие птицы
   3) Заголовок hero: маска / мягкий подъём
   4) Счётчики
   5) Фото ДУГОЙ-ВЕЕРОМ: центральный крупный + подпись, прокрутка крутит дугу
   6) Блоки «вылетают» + реveal
   Без зависимостей. Уважает prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero');
  var heroBg = hero ? hero.querySelector('.hero-bg') : null;

  /* 1. Заголовок hero — буквы влетают с разных сторон и собираются */
  (function flyTitle() {
    return; // анимация букв заголовка отключена по просьбе — текст статичный
    var rows = document.querySelectorAll('.hero-title .row');
    var di = 0;
    rows.forEach(function (row) {
      var marker = row.querySelector('.marker');
      if (marker) {
        if (row.querySelector('.fly-block')) return;
        var b = document.createElement('span'); b.className = 'fly-block';
        b.style.setProperty('--d', (di * 0.045 + 0.06).toFixed(3) + 's'); di += 3;
        row.insertBefore(b, marker); b.appendChild(marker);
      } else {
        if (row.querySelector('.fly-l')) return;
        var text = row.textContent; row.textContent = '';
        text.split('').forEach(function (ch) {
          var s = document.createElement('span'); s.className = 'fly-l'; s.textContent = ch;
          if (ch.trim() === '') { s.style.animation = 'none'; row.appendChild(s); return; }
          var dir = (di % 2 ? -1 : 1);
          s.style.setProperty('--dx', (dir * (55 + (di * 13) % 70)) + 'px');
          s.style.setProperty('--dy', (((di % 3) - 1) * 42 - 30) + 'px');
          s.style.setProperty('--rot', (dir * (16 + (di * 7) % 26)) + 'deg');
          s.style.setProperty('--d', (di * 0.045).toFixed(3) + 's');
          row.appendChild(s); di++;
        });
      }
    });
  })();

  /* 2. Небо */
  if (hero && !reduce) {
    var sky = document.createElement('div'); sky.className = 'hero-sky'; sky.setAttribute('aria-hidden', 'true');
    [{ w: 240, t: 13, dur: 80, o: 0.36, d: -10 }, { w: 170, t: 50, dur: 106, o: 0.24, d: -48 }, { w: 300, t: 30, dur: 130, o: 0.20, d: -84 }].forEach(function (c) {
      var el = document.createElement('div'); el.className = 'sky-cloud';
      el.style.width = c.w + 'px'; el.style.height = (c.w * 0.5) + 'px'; el.style.top = c.t + '%';
      el.style.setProperty('--o', c.o); el.style.animationDuration = c.dur + 's'; el.style.animationDelay = c.d + 's';
      sky.appendChild(el);
    });
    if (heroBg && heroBg.nextSibling) hero.insertBefore(sky, heroBg.nextSibling); else hero.appendChild(sky);
    var glow = document.createElement('div'); glow.className = 'hero-glow'; glow.setAttribute('aria-hidden', 'true');
    glow.style.top = '2%'; glow.style.right = '6%'; hero.appendChild(glow);
  }

  /* 3. ПАРАЛЛАКС-ГЛУБИНА, ПРИВЯЗАННАЯ К СКРОЛЛУ
     Слои внутри экрана едут с разной скоростью и перекрываются.
     Положит. скорость = слой «отстаёт» (фон), отрицат. = «опережает» (передний план). */
  if (!reduce) {
    var P = [];
    function reg(sel, sp) { document.querySelectorAll(sel).forEach(function (el) { el.style.willChange = 'transform'; P.push({ el: el, s: sp }); }); }
    /* .hero-bg НЕ регистрируем: фото закреплено через background-attachment: fixed,
       а JS-transform ломает fixed-фон */
    reg('.hero-glow', 0.26);    // свет — отстаёт сильнее
    reg('.hero-sky', 0.34);     // облака — глубже всех
    reg('.hero-left', -0.07);   // текст+кнопка — опережают (передний план)

    /* фото hero: на десктопе закреплено через background-attachment: fixed,
       на мобилке fixed отключён — там двигаем фото через CSS-переменную --hero-par
       (сам слой .hero-bg::after имеет запас inset: -16% под сдвиг) */
    var heroBgEl = document.querySelector('.hero-bg');
    var heroEl = document.querySelector('.hero');
    /* секции с фото-фоном, которое должно «залипать» к экрану на мобилке
       (как background-attachment: fixed на десктопе) — элементы, чей ::before рисует фото */
    var fxEls = ['.place-photo', '.why', '.emo-photo'].map(function (s) { return document.querySelector(s); }).filter(Boolean);
    var mqPar = window.matchMedia('(max-width: 720px)');

    var pTick = false;
    function pPaint() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = 0; i < P.length; i++) {
        var r = P[i].el.getBoundingClientRect();
        var shift = (vh / 2 - (r.top + r.height / 2)) * P[i].s;
        P[i].el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      }
      if (heroBgEl && heroEl && mqPar.matches) {
        /* сдвиг = полная величина прокрутки → фото «залипает» к экрану,
           как background-attachment: fixed на десктопе (секция наезжает поверх) */
        var hy = window.scrollY || window.pageYOffset || 0;
        var hh = heroEl.offsetHeight || vh;
        var prog = Math.max(0, Math.min(hy, hh));
        heroBgEl.style.setProperty('--hero-par', prog.toFixed(1) + 'px');
      } else if (heroBgEl) {
        heroBgEl.style.removeProperty('--hero-par');
      }
      /* остальные секции с фото-фоном (Гагра, «Полёт…», руки-сердце):
         слой ::before растянут на 100vh и держится у верха окна через сдвиг -top */
      for (var k = 0; k < fxEls.length; k++) {
        if (mqPar.matches) {
          fxEls[k].style.setProperty('--fx-par', (-fxEls[k].getBoundingClientRect().top).toFixed(1) + 'px');
        } else {
          fxEls[k].style.removeProperty('--fx-par');
        }
      }
      pTick = false;
    }
    window.addEventListener('scroll', function () { if (!pTick) { pTick = true; window.requestAnimationFrame(pPaint); } }, { passive: true });
    window.addEventListener('resize', pPaint);
    window.addEventListener('load', pPaint);
    pPaint();
  }

  /* 4. Счётчики */
  if (hero) {
    var STATS = [{ target: 1500, unit: 'м', label: 'высота старта' }, { target: 20, unit: 'мин', label: 'в воздухе' }, { target: 360, unit: '°', label: 'панорамная съёмка' }];
    var heroStatsHost = document.getElementById('heroStats');
    var band = document.createElement('section'); band.className = 'stats-band'; band.setAttribute('aria-label', 'Ключевые цифры');
    var bi = document.createElement('div'); bi.className = (heroStatsHost ? 'stats-inner' : 'container stats-inner');
    STATS.forEach(function (s) {
      var stat = document.createElement('div'); stat.className = 'stat';
      var num = document.createElement('div'); num.className = 'stat-num';
      var val = document.createElement('span'); val.className = 'count'; val.setAttribute('data-target', s.target); val.textContent = reduce ? s.target.toLocaleString('ru-RU') : '0';
      var unit = document.createElement('span'); unit.className = 'stat-unit'; unit.textContent = s.unit;
      num.appendChild(val); num.appendChild(unit);
      var lbl = document.createElement('div'); lbl.className = 'stat-lbl'; lbl.textContent = s.label;
      stat.appendChild(num); stat.appendChild(lbl); bi.appendChild(stat);
    });
    band.appendChild(bi);
    if (heroStatsHost) { heroStatsHost.appendChild(band); } else { band.classList.add('stats-on-hero'); hero.appendChild(band); }
    var counts = band.querySelectorAll('.count');
    // все три считаются от ОДНОГО общего старта → синхронно, ровно
    var animStart = null, raf = null;
    function frame(ts) {
      if (animStart === null) animStart = ts;
      var p = Math.min(1, (ts - animStart) / 1100), done = p >= 1;
      var e = 1 - Math.pow(1 - p, 1.6);   // мягкая кривая: маленькие числа тикают весь отсчёт, не «застывают»
      counts.forEach(function (el) {
        var target = parseInt(el.getAttribute('data-target'), 10) || 0;
        el.textContent = (done ? target : Math.round(target * e)).toLocaleString('ru-RU');
      });
      if (!done) raf = window.requestAnimationFrame(frame);
    }
    var started = false;
    function startAll() { if (started) return; started = true; raf = window.requestAnimationFrame(frame); }
    if (reduce) {
      counts.forEach(function (el) { el.textContent = (parseInt(el.getAttribute('data-target'), 10) || 0).toLocaleString('ru-RU'); });
    } else {
      // ВАЖНО: не запускаем отсчёт, пока на экране заставка — иначе анимация проходит за шторкой
      var intro = document.getElementById('introCurtain');
      if (intro && document.body.contains(intro)) {
        var mo = new MutationObserver(function () {
          if (!document.body.contains(intro)) { mo.disconnect(); startAll(); }
        });
        mo.observe(document.body, { childList: true });
        setTimeout(startAll, 2600); // фолбэк, если заставка не убралась
      } else {
        setTimeout(startAll, 200); // заставки нет — стартуем сразу
      }
    }
  }

  /* 5. ФОТО-КАРУСЕЛЬ (coverflow): одна большая в центре, по бокам меньше.
        Листает сам человек — стрелки, перетаскивание/свайп, клик по боковой, точки.
        Без автопрокрутки. */
  (function centerCarousel() {
    var place = document.querySelector('.place');
    if (!place) return;
    var IMAGES = ['gallery/g-01.jpg?v=3','gallery/g-02.jpg?v=3','gallery/g-03.jpg?v=3','gallery/g-04.jpg?v=3',
                  'gallery/g-05.jpg?v=3','gallery/g-06.jpg?v=3','gallery/g-07.jpg?v=3'];

    var sec = document.createElement('section'); sec.className = 'shots-section'; sec.id = 'shots';
    sec.setAttribute('aria-label', 'Кадры из реальных полётов'); sec.tabIndex = 0;
    var head = document.createElement('div'); head.className = 'shots-head';
    head.innerHTML = '<span class="eyebrow"><span class="dot"></span>Кадры из реальных полётов</span><h2>МОРЕ, ГОРЫ И <span class="marker">НЕБО</span></h2>';
    sec.appendChild(head);

    var cf = document.createElement('div'); cf.className = 'cf';
    var stage = document.createElement('div'); stage.className = 'cf-stage';
    var slides = [];
    IMAGES.forEach(function (src, i) {
      var s = document.createElement('button'); s.type = 'button'; s.className = 'cf-slide';
      s.setAttribute('aria-label', 'Фото ' + (i + 1));
      var img = document.createElement('img'); img.src = src; img.alt = ''; img.loading = 'lazy'; img.draggable = false;
      s.appendChild(img); stage.appendChild(s); slides.push(s);
    });
    cf.appendChild(stage);

    var prev = document.createElement('button'); prev.type = 'button'; prev.className = 'cf-nav cf-prev'; prev.setAttribute('aria-label', 'Предыдущее фото');
    prev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
    var next = document.createElement('button'); next.type = 'button'; next.className = 'cf-nav cf-next'; next.setAttribute('aria-label', 'Следующее фото');
    next.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
    cf.appendChild(prev); cf.appendChild(next);

    var dots = document.createElement('div'); dots.className = 'cf-dots';
    slides.forEach(function (_, i) {
      var d = document.createElement('button'); d.type = 'button'; d.className = 'cf-dot'; d.setAttribute('aria-label', 'К фото ' + (i + 1));
      d.addEventListener('click', function () { go(i); }); dots.appendChild(d);
    });
    cf.appendChild(dots);
    sec.appendChild(cf);

    var anchor = place, nx = place.nextElementSibling;
    if (nx && nx.classList && nx.classList.contains('screen-gap')) anchor = nx;
    anchor.parentNode.insertBefore(sec, anchor.nextSibling);

    var n = slides.length, cur = 0;
    function layout() {
      slides.forEach(function (s, i) {
        var off = i - cur;
        if (off > n / 2) off -= n;        // закольцовка: дальние кадры заходят с другой стороны
        if (off < -n / 2) off += n;
        var prev = s._off; s._off = off;
        var wrapped = (prev !== undefined) && Math.abs(off - prev) > n / 2;
        if (wrapped) s.style.transition = 'none';   // перескок через край — без проезда через весь экран
        var abs = Math.abs(off);
        s.classList.toggle('is-active', off === 0);
        s.style.zIndex = String(100 - abs);
        var x = off * 60;
        var scale = off === 0 ? 1 : Math.max(0.6, 0.8 - (abs - 1) * 0.12);
        var rot = off === 0 ? 0 : (off < 0 ? 7 : -7);
        s.style.transform = 'translate(-50%,-50%) translateX(' + x + '%) scale(' + scale + ') rotateY(' + rot + 'deg)';
        s.style.opacity = abs > 2 ? '0' : (off === 0 ? '1' : '0.5');
        s.style.pointerEvents = abs > 2 ? 'none' : 'auto';
      });
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === cur); });
      window.requestAnimationFrame(function () {
        slides.forEach(function (s) { if (s.style.transition === 'none') s.style.transition = ''; });
      });
    }
    function go(i) { cur = ((i % n) + n) % n; layout(); }
    function step(d) { go(cur + d); }
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });

    var sx = 0, dragging = false, moved = false;
    slides.forEach(function (s, i) { s.addEventListener('click', function () { if (moved) return; if (i !== cur) go(i); }); });
    function down(x) { dragging = true; moved = false; sx = x; }
    function move(x) { if (dragging && Math.abs(x - sx) > 6) moved = true; }
    function up(x) { if (!dragging) return; dragging = false; var dx = x - sx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); }
    stage.addEventListener('pointerdown', function (e) { down(e.clientX); });
    window.addEventListener('pointermove', function (e) { move(e.clientX); });
    window.addEventListener('pointerup', function (e) { up(e.clientX); });
    stage.addEventListener('touchstart', function (e) { down(e.touches[0].clientX); }, { passive: true });
    stage.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
    stage.addEventListener('touchend', function (e) { up((e.changedTouches[0] || { clientX: sx }).clientX); });
    sec.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); });

    layout();
  })();

  /* 6+7. ПОЯВЛЕНИЕ ПРИ СКРОЛЛЕ — единый «fade-up» в стиле AOS (как на etnafly.com)
     Каждый блок плавно проявляется и приподнимается, когда входит в экран.
     Внутри групп — лёгкая лесенка задержек (stagger), как data-aos-delay на etnafly. */
  if (!reduce && 'IntersectionObserver' in window) {
    var aosIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('aos-in'); aosIO.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    function aosTag(el, step, type) {
      if (!el || el.hasAttribute('data-aos')) return;
      el.setAttribute('data-aos', type || 'fade-up');
      if (step) el.style.setProperty('--aos-delay', (step * 0.09).toFixed(2) + 's');
      aosIO.observe(el);
    }
    function mark(sel, type) { document.querySelectorAll(sel).forEach(function (el) { aosTag(el, 0, type); }); }
    function markGroup(sel, type) { document.querySelectorAll(sel).forEach(function (el, i) { aosTag(el, i, type); }); }
    function markSeq(list, type) { list.forEach(function (sel, i) { aosTag(document.querySelector(sel), i, type); }); }

    /* Заголовки и текстовые блоки секций */
    mark('.place-head');
    mark('.section-head');                 /* «как всё происходит» + «5 правил» */
    mark('.how-total');
    mark('.why-head'); mark('.why-cta');
    mark('.shots-head');
    mark('.pricing-head');
    mark('.emo-title'); mark('.emo-cta');
    mark('.contacts-desc'); mark('.contact-form-card');

    /* Видео-блок — последовательное появление */
    markSeq(['.video-title', '.video-sub', '.video-wrap', '.video-cta']);

    /* Сетки карточек — с лесенкой задержек */
    markGroup('.place-grid--images .place-card-img');
    markGroup('.steps .step');
    markGroup('.tips-grid .tip-card');
    markGroup('.pricing-grid .plan');
    markGroup('.addons .addon');
    markGroup('.why-row .why-photo');
    markGroup('.contacts-grid > div');
  }

  /* 8. Новые иконки шагов */
  (function stepIcons() {
    var S = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    var ic = [
      '<svg viewBox="0 0 24 24" ' + S + '><path d="M3 7h11l3 4h3v5h-2"/><path d="M3 7v9h2"/><path d="M9.5 16h5.5"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/></svg>',
      '<svg viewBox="0 0 24 24" ' + S + '><path d="M3 19 9 8l4 6 2-3 6 8z"/><path d="M9 8V3.5l3.2 1.3L9 6.1"/></svg>',
      '<svg viewBox="0 0 24 24" ' + S + '><path d="M4 13a8 8 0 0 1 16 0"/><path d="M3.5 13h17v2.2a1.8 1.8 0 0 1-1.8 1.8H5.3A1.8 1.8 0 0 1 3.5 15.2z"/><path d="M12 5v3"/></svg>',
      '<svg viewBox="0 0 24 24" ' + S + '><path d="M2.5 9.5c4-3.4 14.5-3.4 19 0"/><path d="M2.5 9.5 6 13M21.5 9.5 18 13M7.5 11.5 11 16M16.5 11.5 13 16"/><circle cx="12" cy="18.5" r="1.7"/></svg>',
      '<svg viewBox="0 0 24 24" ' + S + '><rect x="3" y="7" width="18" height="13" rx="2.2"/><path d="M8.5 7 10 4.7h4L15.5 7"/><circle cx="12" cy="13.4" r="3.1"/></svg>',
      '<svg viewBox="0 0 24 24" ' + S + '><path d="M3 18c3 1.6 6-1.6 9 0s6 1.6 9 0"/><path d="M12 4v8"/><path d="M8.5 8.5 12 12l3.5-3.5"/></svg>'
    ];
    document.querySelectorAll('.steps .step').forEach(function (st, i) {
      var bub = st.querySelector('.step-bubble'); if (!bub || !ic[i]) return;
      var old = bub.querySelector('svg'); if (old) old.outerHTML = ic[i];
    });
  })();

  /* 9. WHY — одно большое фото, плавно сменяется */
  (function whyFeature() {
    return; /* отключено: WHY теперь полноэкранное фото с закреплённым фоном */
    var stage = document.querySelector('.why .why-stage');
    var row = document.querySelector('.why .why-row');
    if (!stage || !row) return;
    var PH = ['gallery/land-03.jpg', 'gallery/port-01.jpg', 'gallery/land-04.jpg', 'gallery/port-03.jpg', 'gallery/land-06.jpg'];
    var feat = document.createElement('div'); feat.className = 'why-feature'; feat.setAttribute('aria-hidden', 'true');
    PH.forEach(function (src, i) {
      var d = document.createElement('div'); d.className = 'wf-img' + (i === 0 ? ' on' : '');
      var im = document.createElement('img'); im.src = src; im.alt = ''; im.loading = 'lazy';
      d.appendChild(im); feat.appendChild(d);
    });
    row.parentNode.insertBefore(feat, row);
    document.documentElement.classList.add('has-wfeat');
    if (!reduce && PH.length > 1) {
      var imgs = feat.querySelectorAll('.wf-img'), idx = 0;
      setInterval(function () {
        imgs[idx].classList.remove('on'); idx = (idx + 1) % imgs.length; imgs[idx].classList.add('on');
      }, 3600);
    }
  })();

  /* tilt-эффект карточек тарифов (демо): 3D-наклон «за курсором» */
  (function tiltCards() {
    if (reduce) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return; // только мышь, не тач
    var MAX = 8; // максимальный наклон, градусы
    document.querySelectorAll('.pricing-grid .plan, .tips-grid .tip-card, .tips-grid .tip-photo').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateY(' + (px * MAX * 2).toFixed(2) +
          'deg) rotateX(' + (-py * MAX * 2).toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  })();

  /* шапка: прозрачная над hero, синий фон при скролле */
  (function headerScroll() {
    var h = document.querySelector('.header');
    if (!h) return;
    function upd() { h.classList.toggle('scrolled', window.scrollY > 60); }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  })();

  /* «съезжающийся» заголовок hero: слова стартуют разнесёнными и сходятся
     (вдохновлено tresmarescapital.com). Запуск — в момент ухода заставки. */
  (function convergeTitle() {
    if (reduce) return;
    var h = document.querySelector('.hero-title');
    if (!h) return;
    var nodes = Array.prototype.slice.call(h.childNodes);
    h.textContent = '';
    var words = [];
    nodes.forEach(function (node) {
      if (node.nodeType === 3) { // текстовый узел -> слова
        node.textContent.split(/\s+/).forEach(function (w) {
          if (!w) return;
          var s = document.createElement('span'); s.className = 'cv-word'; s.textContent = w;
          h.appendChild(s); h.appendChild(document.createTextNode(' ')); words.push(s);
        });
      } else if (node.nodeType === 1) { // элемент (рыжий .hl-coral) -> оборачиваем
        var s = document.createElement('span'); s.className = 'cv-word';
        s.appendChild(node);
        h.appendChild(s); h.appendChild(document.createTextNode(' ')); words.push(s);
      }
    });
    var n = words.length, center = (n - 1) / 2, SPREAD = 92;
    words.forEach(function (w, i) {
      w.style.transform = 'translateX(' + ((i - center) * SPREAD).toFixed(0) + 'px)';
    });
    var sub = document.querySelector('.hero-sub');
    var eyebrow = document.querySelector('.hero-left .hero-eyebrow');
    function start() {
      h.classList.add('cv-in');
      // надзаголовок и нижняя фраза появляются ПОСЛЕ того, как отыграет заголовок
      setTimeout(function () {
        if (eyebrow) eyebrow.classList.add('sub-in');
        if (sub) sub.classList.add('sub-in');
      }, 700);
    }
    var intro = document.getElementById('introCurtain');
    if (intro && document.body.contains(intro)) {
      var mo = new MutationObserver(function () {
        if (!document.body.contains(intro)) { mo.disconnect(); setTimeout(start, 140); }
      });
      mo.observe(document.body, { childList: true });
      setTimeout(start, 2700); // фолбэк, если заставка не убралась
    } else {
      setTimeout(start, 220);
    }
  })();

  /* маркер-выделитель: «закрашиваем» рыжим каждый .marker/.marker-coral,
     когда он появляется в кадре (класс .mk-draw запускает CSS-анимацию) */
  (function markerDraw() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('.marker, .marker-coral');
    if (!els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('mk-draw'); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  })();

})();
