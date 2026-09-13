/**
 * Demo hub behaviour tracking, behind a permission banner.
 *
 * Two jobs, in this order:
 *
 *   1. ASK. Nothing that identifies a visitor leaves this page until the
 *      banner is answered. scripts/hub-tracking.mjs has already set Google
 *      Consent Mode to denied and revoked the Pixel's consent before either
 *      tag loaded, so "denied" is the state the page starts in rather than
 *      something applied late.
 *
 *   2. MEASURE. Once allowed, report what a visitor actually did here —
 *      which demos they opened, how long they stayed inside one, whether they
 *      clicked through to order. A page_view alone cannot tell you whether
 *      the hub sells anything.
 *
 * ORGANIC AND ADS ARE MEASURED THE SAME WAY. Same events, same parameters,
 * one code path. They are told apart by `traffic_type`, worked out once from
 * the URL the visitor arrived on and kept for the whole visit — so a person
 * who lands from an ad and then clicks four internal links is still "ads" on
 * the fourth click, which is the only way the numbers mean anything.
 *
 * Declining is honoured, not worked around: with consent denied this file
 * sends nothing at all. There is no "anonymous" fallback stream.
 */
(function () {
  'use strict';

  var CFG = window.HUB_TRACKING || {};
  var SECTION = CFG.siteSection || 'demo-hub';
  var CONSENT_KEY = 'hub.consent.v1';
  var ATTR_KEY = 'hub.attribution.v1';
  var CONSENT_DAYS = Number(CFG.consentDays) || 180;

  /* ----------------------------------------------------------------- store */

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private browsing, or storage full — the visit is simply not remembered */
    }
  }

  /* ----------------------------------------------------------- attribution */

  var PAID_MEDIUMS = ['cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'paid-social', 'display', 'banner', 'retargeting'];
  var AD_HOSTS = /(^|\.)(facebook|instagram|fb|messenger|l\.facebook)\.com$/i;

  function params() {
    try {
      return new URLSearchParams(location.search);
    } catch (err) {
      return new URLSearchParams('');
    }
  }

  /**
   * Which bucket this visit belongs to.
   *
   * A click id is the strongest signal there is — Meta and Google only attach
   * one to a click they charged for — so it outranks utm values, which anyone
   * can type into a URL.
   */
  function classify(q) {
    if (q.get('fbclid') || q.get('gclid') || q.get('gbraid') || q.get('wbraid') || q.get('ttclid')) return 'ads';
    var medium = (q.get('utm_medium') || '').toLowerCase();
    if (PAID_MEDIUMS.indexOf(medium) !== -1) return 'ads';
    if (medium === 'referral' || medium === 'organic' || medium === 'social') return 'organic';
    if (q.get('utm_source')) return 'organic';

    var ref = document.referrer;
    if (!ref) return 'direct';
    try {
      var host = new URL(ref).hostname;
      if (host === location.hostname) return 'internal';
      // A bare facebook.com referrer with no click id is someone who shared
      // the link, not an ad we paid for.
      if (AD_HOSTS.test(host)) return 'organic';
      return 'referral';
    } catch (err) {
      return 'referral';
    }
  }

  /** Meta's own cookie shape, so a browser-built value matches a server one. */
  function buildFbc(fbclid) {
    return 'fb.1.' + Date.now() + '.' + fbclid;
  }

  function attribution() {
    var stored = read(ATTR_KEY);
    var q = params();
    var type = classify(q);

    // First touch wins, except that a genuine ad click always overwrites an
    // earlier organic visit: the ad is what was paid for, and crediting the
    // first organic visit would hide that.
    if (stored && stored.traffic_type && !(type === 'ads' && stored.traffic_type !== 'ads')) {
      return stored;
    }

    var fbclid = q.get('fbclid');
    var next = {
      traffic_type: type,
      utm_source: q.get('utm_source') || (stored && stored.utm_source) || '',
      utm_medium: q.get('utm_medium') || (stored && stored.utm_medium) || '',
      utm_campaign: q.get('utm_campaign') || (stored && stored.utm_campaign) || '',
      utm_content: q.get('utm_content') || (stored && stored.utm_content) || '',
      fbc: fbclid ? buildFbc(fbclid) : (stored && stored.fbc) || '',
      gclid: q.get('gclid') || (stored && stored.gclid) || '',
      landed_on: (stored && stored.landed_on) || location.pathname,
      first_seen: (stored && stored.first_seen) || Date.now(),
    };
    write(ATTR_KEY, next);
    return next;
  }

  var ATTR = attribution();

  /* --------------------------------------------------------------- consent */

  function consentState() {
    var stored = read(CONSENT_KEY);
    if (!stored || typeof stored.granted !== 'boolean') return null;
    var age = Date.now() - (stored.at || 0);
    if (age > CONSENT_DAYS * 86400000) return null; // stale answer: ask again
    return stored.granted;
  }

  var allowed = consentState() === true;

  function applyConsent(granted) {
    allowed = granted;
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
        analytics_storage: granted ? 'granted' : 'denied',
      });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('consent', granted ? 'grant' : 'revoke');
    }
  }

  /* ---------------------------------------------------------------- events */

  var queue = [];

  function uuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (err) {
      /* fall through */
    }
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  var META_NAMES = {
    page_view: 'PageView',
    view_demo: 'ViewContent',
    select_demo: 'ViewContent',
    demo_engaged: 'ViewContent',
    order_click: 'Lead',
    contact_click: 'Contact',
  };

  /**
   * Send one event to both destinations with a shared id.
   *
   * The id is what lets Meta collapse a browser event and a server one into a
   * single action instead of counting two. Nothing sends server-side from the
   * hub today, but an event without an id can never be deduplicated later, and
   * this is the cheapest possible time to include one.
   */
  function fire(name, data) {
    var payload = {};
    for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) payload[k] = data[k];
    payload.site_section = SECTION;
    payload.traffic_type = ATTR.traffic_type;
    if (ATTR.utm_source) payload.utm_source = ATTR.utm_source;
    if (ATTR.utm_medium) payload.utm_medium = ATTR.utm_medium;
    if (ATTR.utm_campaign) payload.utm_campaign = ATTR.utm_campaign;
    payload.event_id = payload.event_id || uuid();

    if (!allowed) {
      // Held, not dropped: if the banner is accepted a moment later, the
      // page_view that happened before the click still gets reported, which
      // is what makes the first session's funnel complete.
      if (queue.length < 40) queue.push([name, payload]);
      return;
    }

    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, payload);
      if (window.dataLayer && typeof window.dataLayer.push === 'function') {
        window.dataLayer.push({ event: 'hub_' + name, hub: payload });
      }
      var metaName = META_NAMES[name];
      if (metaName && typeof window.fbq === 'function') {
        window.fbq('track', metaName, payload, { eventID: payload.event_id });
      }
    } catch (err) {
      /* a blocked tag is not the visitor's problem */
    }
  }

  function flush() {
    var pending = queue.slice();
    queue.length = 0;
    for (var i = 0; i < pending.length; i++) fire(pending[i][0], pending[i][1]);
  }

  /* ------------------------------------------------------------ page shape */

  /** Which hub page this is, and which demo it is showing. */
  function pageInfo() {
    var path = location.pathname.replace(/\/+$/, '');
    var viewer = path.match(/^\/d\/([^/]+)(?:\/(.+))?$/);
    if (viewer) return { page_type: 'demo_viewer', demo_slug: viewer[1], demo_page: viewer[2] || 'home' };
    if (path === '' || path === '/index.html') return { page_type: 'hub_home' };
    return { page_type: 'other' };
  }

  var PAGE = pageInfo();

  /* ---------------------------------------------------------------- banner */

  var BANNER_ID = 'hub-consent';

  function dismissBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function decide(granted) {
    write(CONSENT_KEY, { granted: granted, at: Date.now(), v: 1 });
    applyConsent(granted);
    dismissBanner();
    if (granted) {
      flush();
      fire('consent_granted', {});
    } else {
      queue.length = 0;
    }
  }

  function showBanner() {
    if (document.getElementById(BANNER_ID)) return;

    var wrap = document.createElement('div');
    wrap.id = BANNER_ID;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Cookies and measurement');
    wrap.innerHTML =
      '<div class="hub-consent-in">' +
      '<p class="hub-consent-text"><strong>Can we see how you use these demos?</strong> ' +
      'We measure which demos get opened and how long people stay, so we know which builds are worth making. ' +
      'Analytics and advertising cookies only — say no and the site works exactly the same.' +
      (CFG.privacyUrl ? ' <a class="hub-consent-link" href="' + CFG.privacyUrl + '" target="_blank" rel="noopener">What we collect</a>' : '') +
      '</p>' +
      '<div class="hub-consent-actions">' +
      '<button type="button" class="hub-consent-btn hub-consent-no" data-consent="no">No thanks</button>' +
      '<button type="button" class="hub-consent-btn hub-consent-yes" data-consent="yes">Allow</button>' +
      '</div></div>';

    var style = document.createElement('style');
    style.textContent =
      '#' + BANNER_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
      'background:#0A0F0D;color:#E6EFEA;border-top:1px solid rgba(0,208,132,.35);' +
      'box-shadow:0 -10px 30px rgba(0,0,0,.35);font:400 14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}' +
      '#' + BANNER_ID + ' .hub-consent-in{max-width:1100px;margin:0 auto;padding:14px 16px;' +
      'display:flex;gap:14px;align-items:center;flex-wrap:wrap}' +
      '#' + BANNER_ID + ' .hub-consent-text{margin:0;flex:1 1 300px;min-width:0;color:#B9C8C0}' +
      '#' + BANNER_ID + ' .hub-consent-text strong{color:#fff;display:block;margin-bottom:2px}' +
      '#' + BANNER_ID + ' .hub-consent-link{color:#00D084;text-decoration:underline}' +
      '#' + BANNER_ID + ' .hub-consent-actions{display:flex;gap:8px;flex:0 0 auto}' +
      /* Padding, not a fixed height: the labels have to stay inside the button
         when a narrow screen wraps them, and they still clear 24px. */
      '#' + BANNER_ID + ' .hub-consent-btn{cursor:pointer;border-radius:8px;padding:9px 16px;' +
      'font:600 14px/1.2 inherit;border:1px solid transparent}' +
      '#' + BANNER_ID + ' .hub-consent-no{background:transparent;color:#B9C8C0;border-color:rgba(255,255,255,.25)}' +
      '#' + BANNER_ID + ' .hub-consent-yes{background:#00D084;color:#04150E}' +
      '#' + BANNER_ID + ' .hub-consent-btn:hover{filter:brightness(1.08)}' +
      '#' + BANNER_ID + ' .hub-consent-btn:focus-visible{outline:2px solid #00D084;outline-offset:2px}';

    wrap.addEventListener('click', function (event) {
      var btn = event.target.closest ? event.target.closest('[data-consent]') : null;
      if (!btn) return;
      decide(btn.getAttribute('data-consent') === 'yes');
    });

    document.head.appendChild(style);
    document.body.appendChild(wrap);
  }

  /* ------------------------------------------------------------ behaviour */

  function wireBehaviour() {
    // Order buttons. The link already carries utm values for the landing page;
    // this records that the click happened HERE, on this demo, which the
    // landing page cannot know.
    document.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('a,button') : null;
      if (!target) return;

      var order = target.getAttribute('data-order');
      if (order) {
        fire('order_click', { placement: order, item: target.getAttribute('data-order-item') || '', demo_slug: PAGE.demo_slug || '' });
        return;
      }

      var href = target.getAttribute('href') || '';
      if (/^https:\/\/wa\.me\//.test(href)) { fire('contact_click', { channel: 'whatsapp' }); return; }
      if (/^mailto:/.test(href)) { fire('contact_click', { channel: 'email' }); return; }

      // A card click on the hub home page: which demo drew the interest.
      var card = target.closest ? target.closest('a[href*="/d/"]') : null;
      if (card && PAGE.page_type === 'hub_home') {
        var slug = (card.getAttribute('href') || '').replace(/^.*\/d\//, '').replace(/\/.*$/, '');
        if (slug) fire('select_demo', { demo_slug: slug });
      }
    }, true);

    // Scroll depth on the hub's own pages. Once per threshold, never repeated.
    var marks = [25, 50, 75, 100];
    var hit = {};
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var doc = document.documentElement;
        var scrollable = doc.scrollHeight - doc.clientHeight;
        if (scrollable < 200) return; // too short to have a "depth"
        var pct = Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100);
        for (var i = 0; i < marks.length; i++) {
          if (pct >= marks[i] && !hit[marks[i]]) {
            hit[marks[i]] = true;
            fire('scroll_depth', { percent: marks[i], page_type: PAGE.page_type });
          }
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Time actually spent inside a demo. Someone who opens a viewer and leaves
    // in two seconds did not look at it; thirty seconds is a real signal, and
    // it is the one worth building a retargeting audience from.
    if (PAGE.page_type === 'demo_viewer') {
      var start = Date.now();
      var engaged = false;
      var timer = setInterval(function () {
        if (document.hidden) return;
        if (!engaged && Date.now() - start >= 30000) {
          engaged = true;
          clearInterval(timer);
          fire('demo_engaged', { demo_slug: PAGE.demo_slug, seconds: 30 });
        }
      }, 2000);
    }

    // The viewer's own controls, if this build has them.
    document.addEventListener('click', function (event) {
      var el = event.target.closest ? event.target.closest('[data-view],[data-device],.vb-order') : null;
      if (!el) return;
      var device = el.getAttribute('data-device') || el.getAttribute('data-view');
      if (device) fire('toggle_device', { device: device, demo_slug: PAGE.demo_slug || '' });
    }, true);
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    applyConsent(allowed);

    var base = { page_type: PAGE.page_type, page_path: location.pathname };
    if (PAGE.demo_slug) base.demo_slug = PAGE.demo_slug;
    if (PAGE.demo_page) base.demo_page = PAGE.demo_page;
    fire('page_view', base);
    if (PAGE.page_type === 'demo_viewer') fire('view_demo', { demo_slug: PAGE.demo_slug, demo_page: PAGE.demo_page });

    wireBehaviour();

    if (consentState() === null) {
      // Let the page finish painting first. A banner that appears on top of a
      // half-drawn page reads as an error, and it is the first thing a client
      // sees when they open the hub.
      setTimeout(showBanner, 900);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Exposed so a page can report something the generic wiring cannot see, and
  // so the tests have something to call.
  window.hubTrack = { fire: fire, attribution: function () { return ATTR; }, page: PAGE, consent: consentState };
})();
