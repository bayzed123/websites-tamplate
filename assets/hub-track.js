/**
 * Demo hub behaviour tracking.
 *
 * THE TWO VENDORS ARE GATED DIFFERENTLY, AND THAT IS THE POINT OF THIS FILE.
 *
 *   META runs on arrival. The Pixel and the Conversions API are how this
 *   business finds out whether the demos produce work — which demo someone
 *   opened, how long they stayed, whether they went on to ask for a build.
 *   A banner that most visitors dismiss without reading does not produce
 *   consent; it produces a measurement gap that makes every campaign decision
 *   worse. It is loaded from boot(), never from the banner, so the banner can
 *   never delay it.
 *
 *   GOOGLE still waits for a yes. Nothing is lost by asking: GA4 answers
 *   "how many and from where", which is useful and is not what an ad campaign
 *   is optimised against. And loading gtag.js up front with Consent Mode set
 *   to denied is NOT good enough — GA4 still sends a cookieless ping on every
 *   page so Google can model the conversions it is not allowed to measure.
 *   Our own test caught that happening after a visitor pressed "No thanks".
 *
 * WHAT MAKES THE FIRST HALF DEFENSIBLE IS THE WAY OUT.
 * "Always on" with no way to stop it is surveillance with a privacy policy
 * attached. So there is a real one: a link in the banner, a permanent link in
 * the footer, #stop-tracking on any hub URL, and hubTrack.optOut(). It stops
 * the Pixel AND the server events, removes the script elements from the page
 * so nothing else can reach Meta through them, and is remembered with no
 * expiry — a consent answer goes stale after six months so it can be asked
 * again, a refusal does not.
 *
 * Under EU/UK ePrivacy an advertising pixel needs consent before it loads, and
 * Meta's Business Tools Terms put that obligation on the site owner. This
 * arrangement assumes an audience that is not primarily in those
 * jurisdictions; TRACKING.metaAlwaysOn in scripts/hub-tracking.mjs is the one
 * switch that puts Meta back behind the banner.
 *
 * ORGANIC AND ADS ARE MEASURED THE SAME WAY. Same events, same parameters,
 * one code path. They are told apart by `traffic_type`, worked out once from
 * the URL the visitor arrived on and kept for the whole visit — so a person
 * who lands from an ad and then clicks four internal links is still "ads" on
 * the fourth click, which is the only way the numbers mean anything.
 *
 * Every Meta event also goes server-side through the backend's /api/track
 * under the same event_id, so the pair is collapsed into one action and an
 * ad-blocked visitor is still measured. browser_fired reports whether fbq()
 * really ran, which is the only thing that distinguishes "blocked" from
 * "fine" — the server half succeeds either way.
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

  /* ---------------------------------------------------------------- opt-out
     The one switch that turns everything off, including Meta.

     "Measurement runs by default" is only defensible if there is a real way
     out, so this is it: a link in the banner, a permanent link in the footer,
     the #stop-tracking hash on any hub URL, and hubTrack.optOut(). Choosing it
     stops the Pixel and the server events immediately — not at the next page
     load — and is remembered with no expiry. A consent answer goes stale after
     six months on purpose; a refusal does not, because asking someone again
     and again until they say yes is the thing this is supposed to not be. */

  var OPTOUT_KEY = 'hub.optout.v1';

  function optedOut() {
    var stored = read(OPTOUT_KEY);
    return Boolean(stored && stored.out === true);
  }

  var refused = optedOut();

  /**
   * Is this a real visit, or somebody running the hub on their own machine?
   *
   * Local page views are not customers. They are a developer with the site
   * open, a test suite driving a browser, or CI building a preview — and every
   * one of them lands in the same Meta dataset the campaigns are optimised
   * against, tagged as a real person who looked at a demo and left.
   *
   * This was found the hard way: the CI run for this very change posted live
   * PageView and ViewContent events into the production pixel from 127.0.0.1,
   * because the server-side call added here talks to the deployed Worker from
   * wherever it runs. A handful of phantom visits per push is small and it is
   * also permanent — Meta does not offer a delete-by-origin.
   *
   * The tests need the measurement path to actually run, so they opt back in
   * with __HUB_ALLOW_LOCAL, set before any page script. That is deliberately
   * the only way past this: a flag a test sets explicitly, not a hostname
   * pattern that could match something real.
   */
  function isLocalVisit() {
    if (window.__HUB_ALLOW_LOCAL === true) return false;
    var host = location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
      host === '' || /\.local$/i.test(host);
  }

  var local = isLocalVisit();

  /** Whether Meta may run at all: configured, a real visit, not switched off
   *  by the visitor, and either always-on or covered by a granted answer. */
  function metaAllowed() {
    if (local || refused || !CFG.pixel) return false;
    return CFG.metaAlwaysOn === true || consentState() === true;
  }

  var allowed = consentState() === true;

  var googleLoaded = false;
  var metaLoaded = false;

  function inject(src) {
    var el = document.createElement('script');
    el.async = true;
    el.src = src;
    document.head.appendChild(el);
  }

  /**
   * Google's libraries. Only ever called with consent in hand.
   *
   * gtag() already exists as the standard stub that queues into dataLayer, so
   * the consent update, the config and any events pushed here are replayed in
   * order the moment gtag.js finishes loading. That is what lets an event
   * raised while the banner was open still arrive correctly attributed.
   */
  function loadGoogle() {
    if (googleLoaded) return;
    googleLoaded = true;

    if (CFG.ga4) {
      window.gtag('js', new Date());
      // send_page_view is off because this file reports the page itself, with
      // the traffic_type and demo slug attached.
      window.gtag('config', CFG.ga4, { send_page_view: false });
      inject('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.ga4));
    }

    if (CFG.gtm) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      inject('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CFG.gtm));
    }
  }

  /**
   * Meta's library, loaded on arrival rather than on an answer.
   *
   * Two details matter here and neither is cosmetic.
   *
   * The script comes from the backend's /api/pixel.js, not from
   * connect.facebook.net, because every mainstream blocklist carries a rule
   * for that hostname — and when it matches, fbq() stays a stub and the
   * browser half of every event disappears with no error anywhere. If our
   * proxy is unreachable the page falls back to Meta's own copy, which is
   * where every site starts.
   *
   * And this is called from boot(), never from the banner, so the banner
   * cannot delay it. A consent dialog that holds the Pixel for 900ms while it
   * waits to be dismissed is a measurement gap dressed as a privacy control.
   */
  function loadMeta() {
    if (metaLoaded || !metaAllowed()) return;
    metaLoaded = true;

    /* Meta's own loader stub, minus the script injection it normally does —
       inject() does that — so fbq queues until fbevents.js arrives. */
    if (!window.fbq) {
      var n = (window.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!window._fbq) window._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];

      var el = document.createElement('script');
      el.async = true;
      el.src = (CFG.apiBase || '') + '/api/pixel.js';
      el.onerror = function () { inject('https://connect.facebook.net/en_US/fbevents.js'); };
      document.head.appendChild(el);
    }
    window.fbq('init', CFG.pixel);
  }

  /** Is the real library running, or is it still our stub? The stub above
   *  deliberately does not define callMethod; fbevents.js does. That is the
   *  only honest way to tell an ad-blocker from a healthy page. */
  function pixelIsLive() {
    return typeof window.fbq === 'function' && typeof window.fbq.callMethod === 'function';
  }

  function applyConsent(granted) {
    allowed = granted && !local;
    // Same rule as Meta: a local run pressing Allow must not put gtag.js and a
    // page_view into the live GA4 property.
    if (!allowed) return; // nothing Google-side is loaded, so nothing to tell

    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
    loadGoogle();
  }

  /**
   * Turn everything off, now and in future.
   *
   * Removes the script elements as well as setting the flag. Leaving
   * fbevents.js in the page after someone asked to be left alone would mean
   * the next fbq() call in any other code still reached Meta — the flag would
   * be a promise this file made and could not keep.
   */
  function optOut() {
    refused = true;
    write(OPTOUT_KEY, { out: true, at: Date.now(), v: 1 });
    write(CONSENT_KEY, { granted: false, at: Date.now(), v: 1 });
    allowed = false;
    // `queue` is declared below and hoisted, so it exists but may still be
    // undefined if this somehow ran before the events section was evaluated.
    if (queue) queue.length = 0;

    try {
      var scripts = document.querySelectorAll(
        'script[src*="fbevents.js"],script[src*="/api/pixel.js"],' +
        'script[src*="googletagmanager.com"]');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].parentNode) scripts[i].parentNode.removeChild(scripts[i]);
      }
      // fbq stays defined so unrelated code calling it does not throw — it
      // simply stops doing anything.
      window.fbq = function () {};
      window.fbq.queue = [];
    } catch (err) {
      /* a page that will not let us tidy up is still opted out */
    }
    return true;
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

    /* Meta first, and independently of the banner.
       The two destinations are gated differently now: Meta runs on arrival
       (unless the visitor opted out), Google waits for a yes. Handling them in
       one branch was what made the old version hold BOTH behind the answer. */
    var metaName = META_NAMES[name];
    if (metaName && metaAllowed()) {
      try {
        if (typeof window.fbq === 'function') {
          window.fbq('track', metaName, payload, { eventID: payload.event_id });
        }
      } catch (err) {
        /* a blocked tag is not the visitor's problem */
      }
      // The server half, under the same id, so Meta collapses the pair into
      // one action. This is what keeps an ad-blocked visitor measurable — the
      // browser call above is exactly the one a blocker stops.
      sendServerCopy(metaName, payload);
    }

    if (!allowed) {
      // Google only. Held, not dropped: if the banner is accepted a moment
      // later, the page_view that happened before the click still gets
      // reported, which is what makes the first session's funnel complete.
      // Nothing Google-side is on the wire meanwhile — gtag.js is not loaded.
      if (queue.length < 40) queue.push([name, payload]);
      return;
    }

    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, payload);
      if (window.dataLayer && typeof window.dataLayer.push === 'function') {
        window.dataLayer.push({ event: 'hub_' + name, hub: payload });
      }
    } catch (err) {
      /* a blocked tag is not the visitor's problem */
    }
  }

  /** Read a cookie this page can see. fbevents.js writes _fbp and _fbc on this
   *  domain; the Worker cannot read them across origins, so they travel in the
   *  body instead. */
  function cookie(name) {
    var parts = ('; ' + document.cookie).split('; ' + name + '=');
    return parts.length === 2 ? parts.pop().split(';').shift() : null;
  }

  /**
   * The Conversions API half of a hub event.
   *
   * Never throws into the page and never blocks it. browser_fired reports
   * whether fbq() really ran, which is the difference between "this visitor
   * had an ad-blocker" and "everything is fine" — indistinguishable from the
   * server side alone, because the server half succeeds either way.
   */
  function sendServerCopy(metaName, payload) {
    if (!CFG.apiBase || refused || local) return;
    try {
      fetch(CFG.apiBase + '/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The request may outlive the page: order_click is a click that
        // navigates away, and it is the event that matters most.
        keepalive: true,
        body: JSON.stringify({
          event_name: metaName,
          event_id: payload.event_id,
          event_source_url: location.href,
          custom_data: payload,
          user_data: { fbp: cookie('_fbp'), fbc: cookie('_fbc') },
          browser_fired: pixelIsLive(),
          source: 'browser'
        })
      }).catch(function () {});
    } catch (err) {
      /* no fetch, or a CSP that blocks it */
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

  /**
   * Say that the opt-out took effect.
   *
   * A control that silently does nothing visible is indistinguishable from one
   * that is broken, and this is the control a sceptical visitor is most likely
   * to be testing. It says what stopped, and it goes away on its own.
   */
  function confirmOptOut() {
    var note = document.createElement('div');
    note.id = 'hub-optout-note';
    note.setAttribute('role', 'status');
    note.textContent = 'Measurement is off for this browser. Nothing more is sent.';
    note.style.cssText =
      'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;' +
      'background:#0A0F0D;color:#E6EFEA;border:1px solid rgba(0,208,132,.4);border-radius:10px;' +
      'padding:11px 18px;font:500 14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.4);max-width:calc(100% - 32px);text-align:center';
    document.body.appendChild(note);
    setTimeout(function () {
      if (note.parentNode) note.parentNode.removeChild(note);
    }, 6000);
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
    /* The copy has to match what actually happens, or the banner is a lie
       with buttons on it. Advertising measurement is already running by the
       time this appears, so it says so, and it offers the switch that turns it
       off rather than implying "No thanks" would. */
    var metaLine = CFG.metaAlwaysOn
      ? 'Advertising measurement is already on, so we can tell which demos lead to real work. ' +
        'You can switch it off completely, any time.'
      : 'Analytics and advertising cookies only — say no and the site works exactly the same.';

    wrap.innerHTML =
      '<div class="hub-consent-in">' +
      '<p class="hub-consent-text"><strong>Can we see how you use these demos?</strong> ' +
      'We measure which demos get opened and how long people stay, so we know which builds are worth making. ' +
      metaLine +
      (CFG.privacyUrl ? ' <a class="hub-consent-link" href="' + CFG.privacyUrl + '" target="_blank" rel="noopener">What we collect</a>' : '') +
      ' <a class="hub-consent-link" href="#" data-consent="off">Stop all measurement</a>' +
      '</p>' +
      '<div class="hub-consent-actions">' +
      '<button type="button" class="hub-consent-btn hub-consent-no" data-consent="no">No analytics</button>' +
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
      var answer = btn.getAttribute('data-consent');
      if (answer === 'off') {
        event.preventDefault();
        optOut();
        dismissBanner();
        confirmOptOut();
        return;
      }
      decide(answer === 'yes');
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

  /**
   * The permanent way out, for someone who dismissed the banner months ago.
   *
   * An opt-out that only exists inside a banner shown for 900ms on a first
   * visit is not a way out, it is a formality. Any hub URL ending
   * #stop-tracking does it, so the link can be put in a footer, an email, or a
   * privacy page and it will work from all three.
   */
  function wireOptOutLink() {
    var hash = CFG.optOutHash || '#stop-tracking';

    function maybeOptOut() {
      if (location.hash !== hash) return;
      optOut();
      confirmOptOut();
      // Clear the hash so a refresh does not re-fire the confirmation, and so
      // the URL a visitor might share does not silently opt out whoever opens
      // it — that would be the same disrespect in the other direction.
      if (window.history && history.replaceState) {
        history.replaceState(null, '', location.pathname + location.search);
      }
    }

    maybeOptOut();
    window.addEventListener('hashchange', maybeOptOut);

    document.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('a[href$="' + hash + '"]') : null;
      if (!link) return;
      event.preventDefault();
      optOut();
      confirmOptOut();
    }, true);
  }

  function boot() {
    /* Meta first, and before anything that could delay it — not from the
       banner, not after a timer. If the visitor has opted out, metaAllowed()
       is false and nothing loads at all. */
    loadMeta();

    applyConsent(allowed);
    wireOptOutLink();

    var base = { page_type: PAGE.page_type, page_path: location.pathname };
    if (PAGE.demo_slug) base.demo_slug = PAGE.demo_slug;
    if (PAGE.demo_page) base.demo_page = PAGE.demo_page;
    fire('page_view', base);
    if (PAGE.page_type === 'demo_viewer') fire('view_demo', { demo_slug: PAGE.demo_slug, demo_page: PAGE.demo_page });

    wireBehaviour();

    // Nothing to ask someone who has already said no to everything.
    if (!refused && consentState() === null) {
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
  window.hubTrack = {
    fire: fire,
    attribution: function () { return ATTR; },
    page: PAGE,
    consent: consentState,
    /** Turns everything off, including Meta, and remembers it. */
    optOut: optOut,
    optedOut: function () { return refused; },
    /** What is actually running right now, for the tests and for anyone
     *  checking that the page does what the banner says it does. */
    state: function () {
      return { meta: metaAllowed(), google: allowed, optedOut: refused, pixelLive: pixelIsLive() };
    }
  };
})();
