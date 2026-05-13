/*
  ExternalOS UI runtime. Theme toggle, drawer with focus trap,
  sticky-header hairline, magnetic-hover on primary CTAs.
  Respects prefers-reduced-motion. Vanilla, no dependencies.
*/
(function () {
  'use strict';

  var STORAGE_KEY = 'eos-theme';
  var root = document.documentElement;
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyTheme(theme) {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }
  function currentTheme() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (stored === 'dark' || stored === 'light') return stored;
    return prefersDark.matches ? 'dark' : 'light';
  }
  applyTheme(currentTheme());
  prefersDark.addEventListener('change', function () {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!stored) applyTheme(currentTheme());
  });
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-eos-theme-toggle]');
    if (!btn) return;
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    applyTheme(next);
  });

  var drawer = document.querySelector('[data-eos-drawer]');
  var openers = document.querySelectorAll('[data-eos-drawer-open]');
  var lastFocus = null;

  function focusableEls() {
    if (!drawer) return [];
    return Array.prototype.slice.call(
      drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')
    );
  }
  function openDrawer() {
    if (!drawer || drawer.getAttribute('data-open') === 'true') return;
    lastFocus = document.activeElement;
    drawer.setAttribute('data-open', 'true');
    openers.forEach(function (o) { o.setAttribute('aria-expanded', 'true'); });
    document.body.style.overflow = 'hidden';
    if (history && history.pushState) history.pushState({ eosDrawer: true }, '');
    var first = focusableEls()[0];
    if (first) first.focus();
  }
  function closeDrawer(skipHistory) {
    if (!drawer || drawer.getAttribute('data-open') !== 'true') return;
    drawer.setAttribute('data-open', 'false');
    openers.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    if (!skipHistory && history.state && history.state.eosDrawer) history.back();
  }
  openers.forEach(function (o) { o.addEventListener('click', openDrawer); });
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-eos-drawer-close]')) closeDrawer();
    });
    drawer.querySelectorAll('a[href]').forEach(function (a) {
      a.addEventListener('click', function () { closeDrawer(); });
    });
  }
  window.addEventListener('popstate', function () {
    if (drawer && drawer.getAttribute('data-open') === 'true') closeDrawer(true);
  });
  document.addEventListener('keydown', function (e) {
    if (!drawer || drawer.getAttribute('data-open') !== 'true') return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key === 'Tab') {
      var f = focusableEls();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  var header = document.querySelector('[data-eos-header]');
  if (header) {
    var setScrolled = function () {
      header.setAttribute('data-scrolled', window.scrollY > 40 ? 'true' : 'false');
    };
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive: true });
  }

  if (!reduceMotion.matches) {
    var magnets = document.querySelectorAll('[data-magnetic]');
    magnets.forEach(function (el) {
      var maxTravel = 5;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = ((e.clientX - r.left) / r.width - 0.5) * 2 * maxTravel;
        var dy = ((e.clientY - r.top) / r.height - 0.5) * 2 * maxTravel;
        el.style.setProperty('--mx', dx.toFixed(1) + 'px');
        el.style.setProperty('--my', dy.toFixed(1) + 'px');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  // ---------- TICKER (hero "what just changed" feed) ----------

  var ticker = document.querySelector('[data-eos-ticker]');
  if (ticker) {
    var items = ticker.querySelectorAll('.eos-ticker__item');
    if (items.length > 1) {
      var i = 0;
      items[0].setAttribute('data-active', 'true');
      setInterval(function () {
        items[i].setAttribute('data-active', 'false');
        i = (i + 1) % items.length;
        items[i].setAttribute('data-active', 'true');
      }, 4500);
    } else if (items.length === 1) {
      items[0].setAttribute('data-active', 'true');
    }
  }

  // ---------- STAT COUNTER (counts up on viewport entry) ----------

  var stats = document.querySelectorAll('[data-eos-stat]');
  if (stats.length && 'IntersectionObserver' in window && !reduceMotion.matches) {
    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        statObserver.unobserve(el);
        var idx = Array.prototype.indexOf.call(stats, el);
        var target = parseFloat(el.getAttribute('data-eos-stat'));
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        var duration = 2200;
        var delay = idx * 220;
        var start = performance.now() + delay;
        function frame(now) {
          if (now < start) { requestAnimationFrame(frame); return; }
          var t = Math.min(1, (now - start) / duration);
          var eased = 1 - Math.pow(1 - t, 4);
          var value = target === 0 ? 0 : Math.round(target * eased);
          el.textContent = prefix + value + suffix;
          if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.4 });
    stats.forEach(function (s) { statObserver.observe(s); });
  } else {
    stats.forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-eos-stat'));
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      el.textContent = prefix + target + suffix;
    });
  }

  // ---------- REVEAL ON SCROLL (bundles + tools entering viewport) ----------

  var revealEls = document.querySelectorAll('.eos-reveal');
  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute('data-visible', 'true');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.setAttribute('data-visible', 'true'); });
  }

  // ---------- CART (localStorage, ready for Payhip wiring later) ----------

  var CART_KEY = 'eos-cart';

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
  }
  function cartCount() {
    return readCart().length;
  }
  function refreshCartBadge() {
    var nodes = document.querySelectorAll('[data-eos-cart]');
    nodes.forEach(function (n) {
      n.setAttribute('data-count', String(cartCount()));
      var badge = n.querySelector('.eos-header__cart-count');
      if (badge) badge.textContent = String(cartCount());
    });
  }
  function addToCart(sku, name, price) {
    var items = readCart();
    if (items.some(function (i) { return i.sku === sku; })) return false;
    items.push({ sku: sku, name: name, price: price, addedAt: Date.now() });
    writeCart(items);
    refreshCartBadge();
    return true;
  }
  function removeFromCart(sku) {
    var items = readCart().filter(function (i) { return i.sku !== sku; });
    writeCart(items);
    refreshCartBadge();
  }
  window.eosCart = { read: readCart, add: addToCart, remove: removeFromCart, count: cartCount, refresh: refreshCartBadge };
  refreshCartBadge();

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-eos-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    var sku = btn.getAttribute('data-sku');
    var name = btn.getAttribute('data-name');
    var price = btn.getAttribute('data-price');
    if (!sku) return;
    var added = addToCart(sku, name, price);
    var label = btn.querySelector('.eos-button-label') || btn;
    var original = btn.getAttribute('data-original-label') || label.textContent.trim();
    btn.setAttribute('data-original-label', original);
    label.textContent = added ? 'Added to cart' : 'Already in cart';
    setTimeout(function () { label.textContent = original; }, 1800);
  });
})();
