/* ===========================================================================
   Ratings and comments on the demos.

   WHY THIS IS ON THE HUB AT ALL.
   The demos are the sales argument, and until now the only signal they
   produced was a click. Someone who looks at Sidra Noor's admin dashboard for
   four minutes and thinks "this is what I want" had nowhere to say so, and
   nobody asking a question about a demo had anywhere to ask it. A star and a
   comment box are the cheapest way to turn a visit into something that can be
   read later.

   WHERE THE DATA GOES.
   Into the same tables the blog and the case studies use, on the same backend,
   under targets shaped /demos/<slug>/. That is deliberate: one moderation
   queue in the admin dashboard, one reply mechanism, one place to look. The
   Worker normalizes /d/<slug>/ and /demos/<slug>/ to a single row, so the
   framed viewer and the raw demo cannot become two separate tallies.

   MODERATION IS NOT OPTIONAL HERE.
   Comments are stored with approved = 0 and nothing appears until it has been
   read. These pages sit under sayadbayezid.com's own domain and are shown to
   prospective clients; an unmoderated comment box on a sales page is a
   liability, not a feature.

   NOTHING HERE USES innerHTML FOR ANYTHING A STRANGER TYPED.
   Every comment body and name goes in through textContent. The one exception
   is the widget's own markup, which is a literal in this file.
   =========================================================================== */
(function () {
  'use strict';

  var API = 'https://bayezid-agency-api.sayadmdbayezidhosan.workers.dev';

  /* --- small helpers ----------------------------------------------------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function store(action, key, value) {
    // Private browsing and blocked storage both throw on access, not on write.
    // A rating that cannot be remembered locally is a smaller problem than a
    // page that fails to render.
    try {
      if (action === 'get') return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function fmtDate(value) {
    var d = new Date(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z'));
    return isNaN(d.getTime()) ? '' :
      d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* The canonical target for a demo. Matches what the Worker normalizes to, so
     the value sent and the value stored are the same string. */
  function targetFor(slug) { return '/demos/' + slug + '/'; }

  /* --- the home grid ----------------------------------------------------- */

  /**
   * Fills in each card's rating.
   *
   * Deliberately after load and one request per card: the hub is a static site
   * and these numbers live in a database, so they cannot be baked in. Eight
   * small cached GETs costs less than adding a batch endpoint that exists for
   * one caller — and a card whose request fails shows nothing at all rather
   * than "0.0", which would read as a bad demo instead of a missing number.
   */
  function fillCardRatings() {
    var slots = document.querySelectorAll('[data-demo-rating]');
    if (!slots.length) return;
    Array.prototype.forEach.call(slots, function (slot) {
      var slug = slot.getAttribute('data-demo-rating');
      fetch(API + '/api/engagement?target=' + encodeURIComponent(targetFor(slug)))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.rating || !data.rating.count) return;
          clear(slot);
          slot.appendChild(el('span', 'dr-star', '★'));
          slot.appendChild(el('span', null, data.rating.average.toFixed(1)));
          slot.appendChild(el('span', 'dr-count', '(' + data.rating.count + ')'));
          slot.hidden = false;
        })
        .catch(function () {});
    });
  }

  /* --- the viewer panel -------------------------------------------------- */

  function buildPanel(slug, title) {
    var target = targetFor(slug);
    var voteKey = 'demu.rating.' + target;

    var scrim = el('div', 'df-scrim');
    scrim.hidden = true;

    var panel = el('aside', 'df-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Rate ' + title);
    panel.hidden = true;

    var head = el('div', 'df-head');
    head.appendChild(el('h2', null, 'What did you think of ' + title + '?'));
    var close = el('button', 'df-close');
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    head.appendChild(close);
    panel.appendChild(head);

    /* --- stars --- */
    var rateRow = el('div', 'df-rate');
    var starsWrap = el('div', 'df-stars');
    starsWrap.setAttribute('role', 'radiogroup');
    starsWrap.setAttribute('aria-label', 'Rate this demo from 1 to 5');
    var summary = el('p', 'df-summary', 'Loading…');

    var buttons = [];
    for (var i = 1; i <= 5; i++) {
      (function (value) {
        var b = el('button', 'df-star', '★');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.setAttribute('aria-label', value + ' out of 5');
        b.addEventListener('click', function () { vote(value); });
        // Hovering previews the whole run up to that star, which is how every
        // star control anyone has used behaves. Without it the control reads
        // as five separate buttons.
        b.addEventListener('mouseenter', function () { paint(value, true); });
        buttons.push(b);
        starsWrap.appendChild(b);
      })(i);
    }
    starsWrap.addEventListener('mouseleave', function () { paint(currentVote, false); });

    rateRow.appendChild(starsWrap);
    rateRow.appendChild(summary);
    panel.appendChild(rateRow);

    var currentVote = Number(store('get', voteKey)) || 0;

    function paint(upTo, preview) {
      buttons.forEach(function (b, index) {
        var on = index < upTo;
        b.classList.toggle('on', on);
        b.classList.toggle('preview', Boolean(preview) && on);
        b.setAttribute('aria-checked', String(index + 1 === currentVote));
      });
    }

    function vote(value) {
      // Optimistic, and safe to be: the endpoint upserts on (target, voter),
      // so a second tap changes the existing vote rather than adding one.
      currentVote = value;
      store('set', voteKey, String(value));
      paint(value, false);
      summary.textContent = 'Saving…';
      fetch(API + '/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target, rating: value })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.rating) renderRating(data.rating, true);
          else summary.textContent = 'Thanks — that did not save. Try again in a moment.';
        })
        .catch(function () {
          summary.textContent = 'Thanks — that did not save. Try again in a moment.';
        });
    }

    function renderRating(rating, justVoted) {
      if (!rating || !rating.count) {
        summary.textContent = 'No ratings yet — yours would be the first.';
        return;
      }
      summary.textContent = (justVoted ? 'Thanks. ' : '') +
        rating.average.toFixed(1) + ' out of 5 · ' + plural(rating.count, 'rating', 'ratings');
    }

    /* --- comments --- */
    var commentsWrap = el('div', 'df-comments');
    commentsWrap.appendChild(el('h3', null, 'Questions and notes'));
    var list = el('ol', 'df-list');
    var empty = el('p', 'df-empty', 'Nothing here yet. Ask me anything about this build.');
    commentsWrap.appendChild(list);
    commentsWrap.appendChild(empty);

    var form = el('form', 'df-form');
    form.noValidate = true;

    function field(labelText, node, hint) {
      var wrap = el('div', 'df-field');
      var id = 'df-' + Math.random().toString(36).slice(2, 8);
      node.id = id;
      var label = el('label', null, labelText);
      label.setAttribute('for', id);
      wrap.appendChild(label);
      wrap.appendChild(node);
      if (hint) wrap.appendChild(el('span', 'df-hint', hint));
      return wrap;
    }

    var nameInput = el('input');
    nameInput.type = 'text'; nameInput.name = 'name'; nameInput.maxLength = 80;
    nameInput.required = true; nameInput.placeholder = 'What should I call you?';

    var emailInput = el('input');
    emailInput.type = 'email'; emailInput.name = 'email'; emailInput.maxLength = 200;
    emailInput.placeholder = 'Only if you want a reply';

    var bodyInput = el('textarea');
    bodyInput.name = 'body'; bodyInput.maxLength = 2000; bodyInput.required = true;
    bodyInput.placeholder = 'What would you change, or what would you want it to do?';

    /* The honeypot. Hidden from people, irresistible to the simplest bots, and
       the server refuses anything that fills it in. aria-hidden and tabindex
       keep it out of a screen reader's way — a field a blind visitor fills in
       because they were told to would be a trap for the wrong person. */
    var hpWrap = el('div', 'df-hp');
    hpWrap.setAttribute('aria-hidden', 'true');
    var hp = el('input');
    hp.type = 'text'; hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off';
    var hpLabel = el('label', null, 'Leave this field empty');
    hpWrap.appendChild(hpLabel); hpWrap.appendChild(hp);

    var row = el('div', 'df-row');
    row.appendChild(field('Name', nameInput));
    row.appendChild(field('Email', emailInput, 'optional, never published'));
    form.appendChild(row);
    form.appendChild(field('Comment', bodyInput));
    form.appendChild(hpWrap);

    var actions = el('div', 'df-actions');
    var submit = el('button', 'df-submit', 'Post');
    submit.type = 'submit';
    var status = el('p', 'df-status');
    actions.appendChild(submit);
    actions.appendChild(el('span', 'df-hint', 'Read before it appears, so not straight away.'));
    form.appendChild(actions);
    form.appendChild(status);
    commentsWrap.appendChild(form);
    panel.appendChild(commentsWrap);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.className = 'df-status';
      if (!nameInput.value.trim() || !bodyInput.value.trim()) {
        status.textContent = 'A name and a comment, and it is on its way.';
        status.className = 'df-status warn';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Posting…';
      fetch(API + '/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: target,
          name: nameInput.value,
          email: emailInput.value,
          body: bodyInput.value,
          website: hp.value
        })
      })
        .then(function (r) { return r.json().catch(function () { return {}; })
          .then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) {
            status.textContent = res.d.error || 'That did not go through. Try again shortly.';
            status.className = 'df-status warn';
            return;
          }
          form.reset();
          status.textContent = res.d.note || "Thanks — it will appear once it's approved.";
          status.className = 'df-status ok';
        })
        .catch(function () {
          status.textContent = "Couldn't reach the server. Check your connection and try again.";
          status.className = 'df-status warn';
        })
        .then(function () { submit.disabled = false; submit.textContent = 'Post'; });
    });

    function renderComments(comments) {
      clear(list);
      if (!comments || !comments.length) { empty.hidden = false; return; }
      empty.hidden = true;
      comments.forEach(function (comment) {
        var item = el('li', 'df-comment');
        var meta = el('div', 'df-meta');
        meta.appendChild(el('strong', null, comment.name));
        var when = fmtDate(comment.created_at);
        if (when) meta.appendChild(el('time', null, when));
        item.appendChild(meta);
        item.appendChild(el('p', null, comment.body));
        // An owner reply is visually distinct, because "the person who built
        // this answered" is the single most persuasive thing on the panel.
        if (comment.reply) {
          var reply = el('div', 'df-reply');
          reply.appendChild(el('strong', null, 'Sayad Md Bayezid Hosan'));
          reply.appendChild(el('p', null, comment.reply));
          item.appendChild(reply);
        }
        list.appendChild(item);
      });
    }

    function load() {
      fetch(API + '/api/engagement?target=' + encodeURIComponent(target))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data) {
            summary.textContent = 'Ratings are unavailable right now.';
            return;
          }
          renderRating(data.rating, false);
          renderComments(data.comments);
          if (currentVote) paint(currentVote, false);
        })
        .catch(function () { summary.textContent = 'Ratings are unavailable right now.'; });
    }

    var loaded = false;
    function open() {
      scrim.hidden = false; panel.hidden = false;
      document.body.classList.add('df-open');
      if (!loaded) { loaded = true; load(); }
      // Focus the first star so the panel is usable from the keyboard the
      // moment it opens, rather than leaving focus behind on the button.
      buttons[0].focus();
    }
    function shut() {
      scrim.hidden = true; panel.hidden = true;
      document.body.classList.remove('df-open');
    }
    close.addEventListener('click', shut);
    scrim.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) shut(); });

    document.body.appendChild(scrim);
    document.body.appendChild(panel);
    return { open: open };
  }

  /* --- wiring ------------------------------------------------------------ */

  function init() {
    fillCardRatings();

    var trigger = document.querySelector('[data-demo-feedback]');
    if (!trigger) return;
    var slug = trigger.getAttribute('data-demo-feedback');
    var title = trigger.getAttribute('data-demo-title') || 'this demo';
    if (!slug) return;
    var panel = buildPanel(slug, title);
    trigger.addEventListener('click', function (e) { e.preventDefault(); panel.open(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
