/* ============================================================
   apple-fx.js — Apple 官网级滚动编排（作品集全站共享 · 零依赖）
   挂载：各页 </body> 前 <script src="assets/apple-fx.js" defer></script>
   纪律：
   - JS 失效/禁用 → 无 .fx-on → CSS 隐藏态不生效 → 内容全可见
   - prefers-reduced-motion → 全部落终值，不做位移/计数/绘制
   - 只动 transform/opacity/width/stroke-dashoffset（合成器友好）
   - 每个异步回调必须独立作用域（forEach/IIFE），严禁 var 闭包串号
   ============================================================ */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Apple 签名缓动 cubic-bezier(.28,.11,.32,1) ---- */
  function bezier(x1, y1, x2, y2) {
    function bx(t) { return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t; }
    function by(t) { return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t; }
    return function (x) {
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 12; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
      return by(t);
    };
  }
  var EASE = bezier(.28, .11, .32, 1);
  function tween(dur, onUpdate, onDone) {
    var t0 = null;
    requestAnimationFrame(function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      onUpdate(EASE(p), p);
      if (p < 1) requestAnimationFrame(step); else if (onDone) onDone();
    });
  }

  /* ---- 激活效果层 ---- */
  root.classList.add('fx-on');

  /* ---- 环境光晕（玻璃采样源） ---- */
  if (!doc.getElementById('ap-wash') && doc.body) {
    var wash = doc.createElement('div');
    wash.id = 'ap-wash';
    wash.setAttribute('aria-hidden', 'true');
    doc.body.insertBefore(wash, doc.body.firstChild);
  }

  /* ---- 数字滚动 ---- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (!isFinite(target)) return;
    var suffix = el.getAttribute('data-suffix') || '';
    var dec = (target % 1 !== 0) ? 1 : 0;
    function fmt(v) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
    if (rm) { el.textContent = fmt(target) + suffix; return; }
    el.textContent = fmt(0) + suffix;
    tween(900, function (e) { el.textContent = fmt(target * e) + suffix; },
      function () { el.textContent = fmt(target) + suffix; });
  }

  /* ---- 柱状生长 ---- */
  function growBars(scope) {
    var bars = scope.querySelectorAll('.fl[data-w]');
    for (var i = 0; i < bars.length; i++) {
      (function (bar, idx) {
        if (rm) { bar.style.transition = 'none'; bar.style.width = bar.getAttribute('data-w') + '%'; return; }
        setTimeout(function () { bar.style.width = bar.getAttribute('data-w') + '%'; }, idx * 70);
      })(bars[i], i);
    }
  }

  /* ---- 折线绘制（stroke-dashoffset + 零值点弹出 + 面积淡入） ---- */
  function drawChart(svg) {
    if (!svg || rm) return;
    if (svg.getAttribute('data-drawn')) return;   /* 防重复触发重启动画 */
    svg.setAttribute('data-drawn', '1');
    var pl = svg.querySelector('polyline');
    if (!pl || !pl.getTotalLength) return;
    var len = pl.getTotalLength();
    if (!len) return;
    pl.style.strokeDasharray = len;
    pl.style.strokeDashoffset = len;
    pl.getBoundingClientRect(); /* 强制回流，确保过渡触发 */
    pl.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.28,.11,.32,1)';
    pl.style.strokeDashoffset = '0';
    var rects = svg.querySelectorAll('rect');
    for (var i = 0; i < rects.length; i++) {
      (function (r, idx) {
        r.style.opacity = '0';
        r.style.transition = 'opacity .4s ease ' + (250 + idx * 12) + 'ms';
        requestAnimationFrame(function () { r.style.opacity = '1'; });
      })(rects[i], i);
    }
    var area = svg.querySelector('polygon.ap-area');
    if (area) {
      area.style.opacity = '0';
      area.style.transition = 'opacity .8s ease 1s';
      requestAnimationFrame(function () { area.style.opacity = '1'; });
    }
  }

  /* ---- 滚动揭示：兄弟 stagger ---- */
  function staggerDelay(el) {
    var sibs = [], c = el.parentElement ? el.parentElement.children : [];
    for (var i = 0; i < c.length; i++) if (c[i].classList && c[i].classList.contains('rv')) sibs.push(c[i]);
    var idx = sibs.indexOf(el);
    return Math.min(idx, 6) * 70;
  }

  var targets = doc.querySelectorAll(
    '.wrap > *, .card, .kpi, .shot, .shotrow, table, #dchart, #mtbars'
  );
  /* 跳过 hero 自身（它走入场动画+滚动联动，不走 reveal） */
  var list = [];
  for (var i = 0; i < targets.length; i++) {
    var el = targets[i];
    if (el.id === 'hero') continue;
    if (el.closest && el.closest('#hero')) continue;
    el.classList.add('rv');
    list.push(el);
  }
  /* 数字滚动目标：进入前先归零，避免终值闪现 */
  var counters = doc.querySelectorAll('[data-count]');
  for (var j = 0; j < counters.length; j++) {
    if (rm) continue;
    var suffix = counters[j].getAttribute('data-suffix') || '';
    counters[j].textContent = (0).toLocaleString('en-US') + suffix;
  }

  /* ---- 单元素激活（所有路径共用；内部幂等） ---- */
  function reveal(el) {
    el.classList.add('in');
    var c = el.querySelector ? el.querySelector('[data-count]') : null;
    if (c && !c.getAttribute('data-done')) { c.setAttribute('data-done', '1'); countUp(c); }
    if (el.hasAttribute('data-count') && !el.getAttribute('data-done')) { el.setAttribute('data-done', '1'); countUp(el); }
    if (el.querySelector && el.querySelector('.fl[data-w]')) growBars(el);
    var ch = el.querySelector ? el.querySelector('#dchart') : null;
    if (ch) drawChart(ch);
    if (el.id === 'dchart') drawChart(el);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      /* forEach：每次迭代独立作用域 —— 杜绝 var 闭包让整批只激活最后一个 */
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        if (rm) { reveal(el); return; }
        var d = staggerDelay(el);
        el.style.transitionDelay = d + 'ms';
        requestAnimationFrame(function () { el.classList.add('in'); });
        setTimeout(function () { reveal(el); }, d);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    list.forEach(function (el) { io.observe(el); });
  } else {
    /* 无 IO：全部直接展示 */
    list.forEach(function (el) { reveal(el); });
  }

  /* ---- 兜底扫描：视口内（或已滚过）仍隐形的元素立即揭示 ----
     防任何单点失效（IO 未触发/竞态/异常）导致内容永久隐形 = 页面出现大段空白 */
  var lastSweep = 0;
  function sweepStuck() {
    var now = Date.now();
    if (now - lastSweep < 250) return;
    lastSweep = now;
    var stuck = doc.querySelectorAll('.rv:not(.in)');
    for (var i = 0; i < stuck.length; i++) {
      var r = stuck[i].getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > -240) {
        stuck[i].classList.add('in');
        reveal(stuck[i]);
      }
    }
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(sweepStuck); }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(sweepStuck); }, { passive: true });
  setTimeout(sweepStuck, 400);   /* 首屏加载后补扫一次 */

  /* ---- 玻璃导航滚动态 + Hero 滚动联动 ---- */
  var nav = doc.getElementById('nav');
  var hero = doc.getElementById('hero');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset || 0;
      if (nav) nav.classList.toggle('scrolled', y > 6);
      if (hero && !rm) {
        var p = Math.min(y / 460, 1);
        hero.style.transform = 'translateY(' + (p * 36) + 'px)';
        hero.style.opacity = String(1 - p * 0.85);
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- 复制 chip 成功态（页面自有点击逻辑之外，补 Apple 成功样式） ---- */
  doc.addEventListener('click', function (e) {
    var chip = e.target && e.target.closest ? e.target.closest('.copy') : null;
    if (!chip) return;
    chip.classList.add('copied');
    setTimeout(function () { chip.classList.remove('copied'); }, 1800);
  });
})();
