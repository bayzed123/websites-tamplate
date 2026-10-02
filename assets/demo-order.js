/**
 * Ordering, from inside a demo.
 *
 * THE PROBLEM THIS SOLVES
 * A visitor opened a demo, clicked through it, liked it — and then closed the
 * tab. Nothing on the page asked for the order. The only route to one was a
 * link out to the offer page, which is a second site, a second decision and a
 * second chance to lose them. Most people did not take it.
 *
 * So the ask now happens where the interest is: on the demo itself, while they
 * are still looking at the thing they want.
 *
 * TWO DOORS, ON PURPOSE
 * WhatsApp and a form. They are not redundant:
 *
 *   - WhatsApp wins the person who will not fill in anything. One tap, the
 *     message is already written, it names the demo and the parts they ticked.
 *     It costs them nothing and it starts a real conversation.
 *   - The form wins the person who is browsing at midnight, does not want to
 *     talk yet, and would rather leave details than open a chat. It also
 *     captures what a chat usually does not: which features, what budget, what
 *     timeline — the things that turn an enquiry into a quote.
 *
 * Offering only one loses whichever half of the audience it does not suit.
 *
 * WHY THE PREFILLED MESSAGE USES THE NUMBER, NOT THE wa.me/message/ SHORT LINK
 * A wa.me short link opens a chat with a message that was preset in WhatsApp
 * Business — it cannot carry a `text` parameter, so the demo name would be
 * lost and every order would arrive saying the same thing. Click-to-chat with
 * the number does accept `?text=`, which is the only way the message can say
 * "Lk's Attire" and list what they picked. The short link is still what the
 * site's own Chat buttons use, where no per-demo text is wanted.
 *
 * THE POPUP
 * It is an interruption, so it is rationed: once per demo per visitor per
 * week, never before they have spent thirty seconds in the demo, and never
 * while the order panel is already open. Someone who dismisses it is not asked
 * again. An interruption that fires on arrival is an advert; one that fires
 * after they have been reading for half a minute is a question they were
 * already half-asking themselves.
 *
 * Configuration comes from window.DEMU_ORDER, which the builder writes per
 * page — see scripts/build-demo-hub.mjs.
 */
(function () {
  'use strict';

  var cfg = window.DEMU_ORDER;
  if (!cfg || !cfg.api) return;

  var SEEN_KEY = 'demu.order.popup.' + (cfg.slug || 'hub');
  var WEEK = 7 * 24 * 60 * 60 * 1000;

  /* ------------------------------------------------------------- helpers - */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /** localStorage throws in a few real browsers (private mode, cookies off).
   *  A thrown error here would take the order button down with it, so every
   *  access is wrapped — the worst case is that the popup shows again. */
  function remembered(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function remember(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* not worth failing over */ }
  }

  /** The message WhatsApp opens with. Written so that what lands in the phone
   *  is already a usable brief, not "hi". */
  function whatsappHref(picked) {
    var lines = ['Hi! I saw the ' + (cfg.title || 'demo') + ' demo on your demo hub and I want to order it.'];
    if (picked && picked.length) lines.push('', 'I want: ' + picked.join(', '));
    if (cfg.url) lines.push('', 'Demo: ' + cfg.url);
    return 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  /* ---------------------------------------------------------------- CSS - */

  var css = [
    /* Above the consent banner (9999), because this panel is opened by the
       visitor on purpose and a dialog with a bar floating over it reads as
       broken. The popup below stays UNDER it and waits its turn instead —
       nobody asked for that one. */
    '.do-scrim{position:fixed;inset:0;z-index:10000;background:rgba(4,8,6,.72);backdrop-filter:blur(6px);',
    '  display:grid;place-items:center;padding:18px;opacity:0;transition:opacity .22s ease}',
    '.do-scrim.open{opacity:1}',
    '.do-card{width:min(560px,100%);max-height:92vh;overflow:auto;background:#0E1613;color:#EAF2EE;',
    '  border:1px solid rgba(255,255,255,.10);border-radius:20px;padding:26px 24px 22px;',
    '  box-shadow:0 40px 90px rgba(0,0,0,.6);transform:translateY(12px);transition:transform .22s ease}',
    '.do-scrim.open .do-card{transform:none}',
    '.do-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;letter-spacing:.14em;',
    '  text-transform:uppercase;color:#00D084;margin:0 0 8px}',
    '.do-card h2{margin:0 0 8px;font-size:1.32rem;line-height:1.25;font-weight:700}',
    '.do-card p.do-lede{margin:0 0 18px;color:#A9B5AF;font-size:.92rem;line-height:1.6}',
    '.do-close{position:absolute;top:14px;right:16px;background:none;border:0;color:#A9B5AF;font-size:1.5rem;',
    '  line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}',
    '.do-close:hover{color:#EAF2EE;background:rgba(255,255,255,.06)}',
    '.do-card{position:relative}',
    /* The two doors, side by side and equally weighted. */
    '.do-doors{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}',
    '.do-door{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 10px;border-radius:14px;',
    '  text-decoration:none;font-weight:700;font-size:.9rem;border:1px solid transparent;cursor:pointer;',
    '  transition:transform .2s ease,filter .2s ease;text-align:center}',
    '.do-door:hover{transform:translateY(-2px)}',
    '.do-door small{font-weight:500;font-size:.72rem;opacity:.85}',
    '.do-wa{background:#25D366;color:#06281A!important}',
    '.do-wa:hover{filter:brightness(1.06)}',
    '.do-form-btn{background:linear-gradient(100deg,#FF6A2B,#FF3D6E);color:#fff!important}',
    '.do-form-btn:hover{filter:brightness(1.08)}',
    '.do-field{display:block;margin-bottom:12px}',
    '.do-field span{display:block;font-size:.78rem;color:#A9B5AF;margin-bottom:5px}',
    '.do-field input,.do-field textarea,.do-field select{width:100%;background:rgba(255,255,255,.04);color:#EAF2EE;',
    '  border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 12px;font:inherit;font-size:.9rem}',
    '.do-field input:focus,.do-field textarea:focus,.do-field select:focus{outline:2px solid #00D084;outline-offset:1px;border-color:transparent}',
    '.do-field textarea{min-height:74px;resize:vertical}',
    '.do-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.do-pick{margin:0 0 9px;font-size:.8rem;color:#A9B5AF}',
    '.do-feats{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 18px}',
    '.do-feat{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:100px;cursor:pointer;',
    '  border:1px solid rgba(255,255,255,.14);color:#A9B5AF;font-size:.78rem;user-select:none;transition:all .18s}',
    '.do-feat:hover{border-color:#00D084;color:#EAF2EE}',
    '.do-feat input{position:absolute;opacity:0;width:0;height:0}',
    '.do-feat.on{background:rgba(0,208,132,.14);border-color:#00D084;color:#EAF2EE;font-weight:600}',
    '.do-submit{width:100%;border:0;border-radius:100px;padding:14px;font:inherit;font-weight:700;font-size:.95rem;',
    '  cursor:pointer;background:linear-gradient(100deg,#FF6A2B,#FF3D6E);color:#fff;transition:filter .2s}',
    '.do-submit:hover{filter:brightness(1.08)}',
    '.do-submit[disabled]{opacity:.6;cursor:progress}',
    '.do-note{margin:12px 0 0;font-size:.76rem;color:#7D8A84;text-align:center;line-height:1.55}',
    '.do-note a{color:#00D084}',
    '.do-msg{margin:0 0 14px;padding:10px 12px;border-radius:10px;font-size:.84rem;line-height:1.5}',
    '.do-msg.err{background:rgba(255,61,110,.12);border:1px solid rgba(255,61,110,.4);color:#FFB9CB}',
    '.do-msg.ok{background:rgba(0,208,132,.12);border:1px solid rgba(0,208,132,.4);color:#8FF0CB}',
    '.do-done{text-align:center;padding:12px 0 6px}',
    '.do-done .do-tick{font-size:2.4rem;line-height:1;margin-bottom:10px}',
    /* The popup: a corner card on desktop, a bottom sheet on a phone. It must
       never cover the demo it is asking about. */
    '.do-pop{position:fixed;right:18px;bottom:18px;z-index:8500;width:min(340px,calc(100vw - 36px));',
    '  background:#0E1613;color:#EAF2EE;border:1px solid rgba(0,208,132,.35);border-radius:18px;padding:18px 18px 16px;',
    '  box-shadow:0 26px 60px rgba(0,0,0,.55);transform:translateY(14px);opacity:0;transition:all .3s ease}',
    '.do-pop.open{transform:none;opacity:1}',
    '.do-pop h3{margin:0 0 7px;font-size:1rem;line-height:1.3}',
    '.do-pop p{margin:0 0 14px;font-size:.84rem;color:#A9B5AF;line-height:1.55}',
    '.do-pop .do-doors{grid-template-columns:1fr 1fr;gap:8px;margin:0}',
    '.do-pop .do-door{padding:11px 8px;font-size:.82rem}',
    '.do-pop .do-close{top:8px;right:10px;font-size:1.25rem}',
    '@media (max-width:560px){',
    '  .do-doors{grid-template-columns:1fr}.do-row{grid-template-columns:1fr}',
    '  .do-pop{right:10px;left:10px;bottom:10px;width:auto}',
    '  .do-card{padding:22px 18px 18px}',
    '}',
    '@media (prefers-reduced-motion:reduce){.do-scrim,.do-card,.do-pop,.do-door{transition:none}}',
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* --------------------------------------------------------- the panel - */

  var scrim = null;
  var lastFocus = null;

  /**
   * The checklist, above both doors rather than inside the form.
   *
   * It describes the ORDER, not the form: someone who ticks "admin dashboard"
   * and "bKash" and then taps WhatsApp has written the brief just as much as
   * someone who fills the form in, and the message carries it either way. When
   * this lived inside the form it was unreachable for every visitor who chose
   * the faster door — which was most of them.
   */
  function featureChips() {
    var list = cfg.features || [];
    if (!list.length) return '';
    return '<p class="do-pick">What do you want included? Tick anything that applies — it travels with your message.</p>' +
      '<div class="do-feats">' + list.map(function (f, i) {
        return '<label class="do-feat"><input type="checkbox" value="' + esc(f) + '" id="doF' + i + '">' + esc(f) + '</label>';
      }).join('') + '</div>';
  }

  function picked() {
    if (!scrim) return [];
    return [].slice.call(scrim.querySelectorAll('.do-feat input:checked')).map(function (i) { return i.value; });
  }

  function syncWhatsapp() {
    var link = scrim && scrim.querySelector('.do-wa');
    if (link) link.href = whatsappHref(picked());
  }

  function build() {
    scrim = document.createElement('div');
    scrim.className = 'do-scrim';
    scrim.setAttribute('role', 'dialog');
    scrim.setAttribute('aria-modal', 'true');
    scrim.setAttribute('aria-label', 'Order ' + (cfg.title || 'this demo'));
    scrim.innerHTML =
      '<div class="do-card">' +
        '<button class="do-close" type="button" aria-label="Close">&times;</button>' +
        '<p class="do-eyebrow">Order this build</p>' +
        '<h2>' + esc(cfg.title || 'This demo') + ', rebranded for your business</h2>' +
        '<p class="do-lede">Your name, your colours, your products — the same working system you have just clicked through.' +
          (cfg.price ? ' <strong>' + esc(cfg.price) + '</strong>' : '') + '</p>' +
        featureChips() +
        '<div class="do-doors">' +
          '<a class="do-door do-wa" href="' + esc(whatsappHref([])) + '" target="_blank" rel="noopener" data-door="whatsapp">' +
            'Order on WhatsApp<small>Message already written</small></a>' +
          '<button class="do-door do-form-btn" type="button" data-door="form">Send the details<small>Get a quote by reply</small></button>' +
        '</div>' +
        '<form class="do-form" hidden>' +
          '<div class="do-msg" hidden></div>' +
          '<div class="do-row">' +
            '<label class="do-field"><span>Your name</span><input name="name" required maxlength="120" autocomplete="name"></label>' +
            '<label class="do-field"><span>WhatsApp or email</span><input name="contact" required maxlength="200" placeholder="01XXXXXXXXX"></label>' +
          '</div>' +
          '<div class="do-row">' +
            '<label class="do-field"><span>Budget (optional)</span><select name="budget">' +
              '<option value="">Not sure yet</option><option>Under ৳20,000</option><option>৳20,000 – ৳50,000</option>' +
              '<option>৳50,000 – ৳1,00,000</option><option>Over ৳1,00,000</option></select></label>' +
            '<label class="do-field"><span>When (optional)</span><select name="timeline">' +
              '<option value="">No fixed date</option><option>This week</option><option>Within a month</option>' +
              '<option>In 2–3 months</option></select></label>' +
          '</div>' +
          '<label class="do-field"><span>Anything specific? (optional)</span><textarea name="note" maxlength="2000" ' +
            'placeholder="What is different about how you sell?"></textarea></label>' +
          '<button class="do-submit" type="submit">Send my order</button>' +
          '<p class="do-note">Goes straight to Bayezid. No payment now, nothing automatic — you get a reply with a price.</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(scrim);

    scrim.addEventListener('click', function (e) {
      if (e.target === scrim || e.target.closest('.do-close')) close();
    });
    // A ticked feature changes the WhatsApp message too, so someone who ticks
    // three things and then chooses WhatsApp still sends the brief.
    scrim.addEventListener('change', function (e) {
      var label = e.target.closest('.do-feat');
      if (label) label.classList.toggle('on', e.target.checked);
      syncWhatsapp();
    });
    scrim.querySelector('[data-door="form"]').addEventListener('click', function () {
      var form = scrim.querySelector('.do-form');
      form.hidden = false;
      this.closest('.do-doors').querySelector('.do-form-btn').style.display = 'none';
      form.querySelector('[name="name"]').focus();
    });
    scrim.querySelector('.do-form').addEventListener('submit', submit);
    return scrim;
  }

  function msg(kind, text) {
    var node = scrim.querySelector('.do-msg');
    node.className = 'do-msg ' + kind;
    node.textContent = text;
    node.hidden = false;
  }

  function submit(e) {
    e.preventDefault();
    var form = e.target;
    var button = form.querySelector('.do-submit');
    var data = new FormData(form);
    button.disabled = true;
    button.textContent = 'Sending…';

    fetch(cfg.api + '/api/demo-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        demoSlug: cfg.slug, demoTitle: cfg.title,
        name: data.get('name'), contact: data.get('contact'),
        features: picked(), budget: data.get('budget') || null,
        timeline: data.get('timeline') || null, note: data.get('note') || null,
        source: scrim.dataset.source || 'demo-hub',
        pageUrl: location.href,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (result) {
        if (!result.ok) throw new Error(result.error || 'That did not go through.');
        // The order is stored. WhatsApp is offered once more rather than
        // closing on a thank-you, because the fastest reply is still the one
        // that happens in a chat, and they have already said they want this.
        scrim.querySelector('.do-card').innerHTML =
          '<button class="do-close" type="button" aria-label="Close">&times;</button>' +
          '<div class="do-done">' +
            '<div class="do-tick">✅</div>' +
            '<h2>Got it — your order is in.</h2>' +
            '<p class="do-lede">Bayezid has it with everything you ticked. You will get a reply with a price.</p>' +
            '<div class="do-doors" style="grid-template-columns:1fr">' +
              '<a class="do-door do-wa" href="' + esc(whatsappHref(picked())) + '" target="_blank" rel="noopener">' +
                'Want it faster? Message on WhatsApp<small>Same details, already written</small></a>' +
            '</div>' +
          '</div>';
        remember(SEEN_KEY, String(Date.now()));
      })
      .catch(function (error) {
        msg('err', error.message + ' You can still reach Bayezid on WhatsApp — the green button above.');
        button.disabled = false;
        button.textContent = 'Send my order';
      });
  }

  function open(source) {
    if (!scrim) build();
    scrim.dataset.source = source || 'demo-hub';
    lastFocus = document.activeElement;
    scrim.style.display = 'grid';
    syncWhatsapp();
    requestAnimationFrame(function () { scrim.classList.add('open'); });
    document.addEventListener('keydown', onKey);
    hidePopup();
  }

  function close() {
    if (!scrim) return;
    scrim.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(function () { scrim.style.display = 'none'; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  /* ---------------------------------------------------------- the popup - */

  var pop = null;

  function hidePopup() {
    if (!pop) return;
    pop.classList.remove('open');
    setTimeout(function () { if (pop && pop.parentNode) pop.parentNode.removeChild(pop); pop = null; }, 300);
  }

  function showPopup() {
    if (pop || (scrim && scrim.classList.contains('open'))) return;
    // Re-checked here, not only when arming: the consent banner is injected by
    // a deferred script, so at arming time it frequently does not exist yet.
    // Checking only then meant the popup opened under a banner that had since
    // appeared — visible, and impossible to click.
    if (somethingElseIsAsking()) { setTimeout(showPopup, 2000); return; }
    remember(SEEN_KEY, String(Date.now()));
    pop = document.createElement('aside');
    pop.className = 'do-pop';
    pop.setAttribute('role', 'complementary');
    pop.innerHTML =
      '<button class="do-close" type="button" aria-label="Close">&times;</button>' +
      '<h3>Want this one for your business?</h3>' +
      '<p>' + esc(cfg.title || 'This demo') + ' can be rebranded and live for you' +
        (cfg.price ? ' — ' + esc(cfg.price) : '') + '. Ask for a price, or talk to the developer first.</p>' +
      '<div class="do-doors">' +
        '<button class="do-door do-form-btn" type="button" data-pop="order">Place an order</button>' +
        '<a class="do-door do-wa" href="' + esc(whatsappHref([])) + '" target="_blank" rel="noopener" data-pop="chat">Contact developer</a>' +
      '</div>';
    document.body.appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add('open'); });

    pop.addEventListener('click', function (e) {
      if (e.target.closest('.do-close')) { hidePopup(); return; }
      if (e.target.closest('[data-pop="order"]')) open('popup');
    });
  }

  /**
   * Hold until nothing else is already interrupting them.
   *
   * hub-track.js puts the cookie-consent banner across the bottom of the
   * screen at z-index 9999 — exactly where this popup sits, and above it. So
   * while that banner is up the popup is not merely rude, it is unclickable:
   * the banner swallows the press on "Place an order". Waiting costs one
   * interruption's worth of patience and is the difference between a popup
   * that works and one that silently eats its own clicks.
   */
  function somethingElseIsAsking() {
    var banner = document.getElementById('hub-consent');
    if (!banner) return false;
    // Measured, not inferred. The obvious test — `banner.offsetParent` — is
    // null for EVERY position:fixed element, which this banner is, so it
    // reported "not shown" while the banner was sitting across the screen and
    // the popup opened underneath it. A rect with size is the thing that
    // actually distinguishes a visible banner from a dismissed one.
    var box = banner.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(banner).visibility !== 'hidden';
  }

  function whenNothingElseIsAsking(run) {
    var tries = 0;
    (function check() {
      if (!somethingElseIsAsking()) return run();
      // About two minutes. Someone who has not answered the consent banner by
      // then is not reading the page either.
      if (++tries > 80) return;
      setTimeout(check, 1500);
    })();
  }

  /**
   * When the popup is allowed to appear.
   *
   * Thirty seconds of dwell, OR the pointer leaving towards the browser chrome
   * (which on a desktop is the clearest "I am about to go" there is). Once a
   * week per demo either way, and never again once they have ordered or closed
   * it — a second ask is an annoyance, not a second chance.
   */
  function armPopup() {
    if (cfg.popup === false) return;
    var seen = remembered(SEEN_KEY);
    if (seen && Date.now() - Number(seen) < WEEK) return;

    var fired = false;
    function fire() {
      if (fired) return;
      fired = true;
      document.removeEventListener('mouseout', onOut);
      showPopup();
    }
    function onOut(e) {
      // relatedTarget is null when the pointer leaves the document entirely.
      if (!e.relatedTarget && e.clientY <= 8) fire();
    }
    whenNothingElseIsAsking(function () {
      setTimeout(fire, 30000);
      // Exit intent waits for eight seconds of dwell before it counts. Someone
      // whose pointer leaves half a second after the page loaded has not
      // looked at the demo — asking them to order it is noise, and at that
      // moment the consent banner has usually not even been injected yet, so
      // the popup would open and then be buried by it.
      setTimeout(function () { document.addEventListener('mouseout', onOut); }, 8000);
    });
  }

  /* ----------------------------------------------------------- wiring - */

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-order-open]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger.getAttribute('data-order-open') || 'demo-hub');
  });

  window.demuOrder = { open: open, close: close };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', armPopup);
  } else {
    armPopup();
  }
})();
