/**
 * SmartGadget demo — the commerce event model.
 *
 * Ported from the live build so a prospect can see the tracking that comes
 * with the real thing: GA4's standard e-commerce schema, the Meta Pixel event
 * that corresponds to each step, and the shared event id that lets a server
 * copy be deduplicated against the browser one.
 *
 * Three rules kept from the original, because each one is a bug someone
 * already paid for:
 *
 *  1. Money goes out in taka, not poisha. Everything inside is integer minor
 *     units; GA4 expects a decimal. Sending 425000 for ৳4,250 inflates
 *     reported revenue a hundredfold.
 *  2. Staff are not shoppers. Nothing fires on an /admin screen.
 *  3. Analytics never breaks a checkout. Every call here is wrapped and
 *     fire-and-forget; a blocked tag must not stop someone buying.
 *
 * And one rule that is this demo's own: with no ids configured, nothing is
 * loaded and nothing is sent. See tracking-config.js for why.
 */
import { TRACKING } from './tracking-config.js';

const GA4 = /^G-[A-Z0-9]{6,}$/;
const GTM = /^GTM-[A-Z0-9]{4,}$/;
const PIXEL = /^\d{15,16}$/;

export const isGa4Configured = () => GA4.test(TRACKING.ga4MeasurementId.trim());
export const isGtmConfigured = () => GTM.test(TRACKING.gtmContainerId.trim());
export const isPixelConfigured = () => PIXEL.test(TRACKING.metaPixelId.trim());
export const isCapiConfigured = () => /^https:\/\/\S+$/.test(TRACKING.capiEndpoint.trim());

/** Poisha → taka, two decimals, the way GA4 wants it. */
export const taka = (poisha) => Math.round(poisha) / 100;

/**
 * Should this visit be measured?
 *
 * The id checks are not decoration. A malformed id still loads a tag and
 * still sends hits — they just land nowhere useful, and you find out weeks
 * later when a report is empty. Refusing to start is louder and cheaper.
 */
function measurable() {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.includes('/admin')) return false;
  return isGa4Configured() || isPixelConfigured();
}

/** Install the tags. Called once, from the page. Safe to call again. */
export function installTags() {
  if (typeof document === 'undefined' || window.__smartgadgetTags) return;
  window.__smartgadgetTags = true;
  window.dataLayer = window.dataLayer || [];

  if (isGtmConfigured()) {
    const id = TRACKING.gtmContainerId.trim();
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(tag);
  }

  if (isGa4Configured()) {
    const id = TRACKING.ga4MeasurementId.trim();
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(tag);
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // send_page_view off: this demo routes between screens itself and reports
    // each one, exactly as the live single-page build does. Leaving it on
    // double-counts the landing page.
    window.gtag('config', id, { send_page_view: false });
  }

  if (isPixelConfigured()) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
    'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', TRACKING.metaPixelId.trim());
  }
}

/** GA4 event name → the Meta Pixel event that means the same thing. */
const META_NAME = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  view_item_list: 'ViewContent',
  select_item: 'ViewContent',
  search: 'Search',
  add_to_cart: 'AddToCart',
  remove_from_cart: 'RemoveFromCart',
  view_cart: 'ViewCart',
  begin_checkout: 'InitiateCheckout',
  add_shipping_info: 'AddShippingInfo',
  add_payment_info: 'AddPaymentInfo',
  purchase: 'Purchase',
  sign_up: 'CompleteRegistration',
  contact: 'Contact',
};

/** Events worth sending a server copy of, and therefore worth an event id. */
const DEDUPED = new Set(['add_to_cart', 'begin_checkout', 'purchase']);

/** Everything this demo has sent, so the page can show it. */
export const sentEvents = [];

export function track(event, params = {}) {
  const eventId = DEDUPED.has(event)
    ? (params.event_id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())))
    : undefined;
  const { event_id: _ignored, ...eventParams } = params;

  // Recorded whether or not a tag is configured — the demo's own event
  // inspector reads this, which is the point: a prospect can watch the
  // tracking work before a single id has been filled in.
  sentEvents.push({ at: new Date().toISOString(), event, params: eventParams, eventId });

  if (!measurable()) return eventId;

  try {
    window.gtag?.('event', event, eventParams);
    const metaEvent = META_NAME[event] || event;
    const args = ['track', metaEvent, eventParams];
    if (eventId) args.push({ eventID: eventId });
    window.fbq?.(...args);

    // The server copy. Same event id as the browser one, which is the whole
    // mechanism Meta deduplicates on — send a different id and one purchase
    // is counted twice.
    if (eventId && isCapiConfigured()) {
      void fetch(TRACKING.capiEndpoint.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: META_NAME[event] || event,
          event_id: eventId,
          event_source_url: window.location.href,
          currency: TRACKING.currency,
          ...eventParams,
        }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never let a blocked tag stop someone buying.
  }
  return eventId;
}

/** What the demo's tracking panel shows about its own configuration. */
export function trackingStatus() {
  return {
    ga4: isGa4Configured(),
    gtm: isGtmConfigured(),
    pixel: isPixelConfigured(),
    capi: isCapiConfigured(),
  };
}
