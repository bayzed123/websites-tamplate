/**
 * The demo hub's own measurement, kept apart from the ad campaign's.
 *
 * WHY THIS IS SEPARATE FROM THE LANDING PAGE
 * The hub is not a campaign page. It is the middle of the funnel: someone
 * arrives from the portfolio or from an ad, opens two or three demos, and
 * either asks for a build or leaves. Until now these pages loaded
 * sayadbayezid.com/ads/assets/ads-track.js — the landing page's own script —
 * so hub visits were reported as landing-page activity and the two could not
 * be told apart.
 *
 * WHAT IS SEPARATE AND WHAT IS NOT
 *   - The GTM container is separate. That is what keeps hub tags out of the
 *     campaign's container: different pages, different tags, different people
 *     editing them.
 *   - The GA4 property and the Meta Pixel are deliberately the SAME as the
 *     campaign's, and every event is stamped `site_section: 'demo-hub'`.
 *     Splitting them would split the journey: an ad click lands on the
 *     campaign page, wanders into the hub, and orders. In one property that is
 *     one funnel you can read; in two it is two halves that never join. For
 *     the Pixel it matters more still — people who browsed the demos and left
 *     are the warmest retargeting audience this funnel produces, and an
 *     audience is only usable by the campaign that shares its pixel.
 *
 * So: one property, one pixel, two containers, and a dimension that separates
 * them. Segment on `site_section` in GA4; the demo hub's traffic is
 * `demo-hub`, the campaign page's is not.
 *
 * ORGANIC AND ADS
 * Both are measured identically — same events, same parameters. They are told
 * apart by `traffic_type`, which assets/hub-track.js derives from the URL the
 * visitor arrived on (fbclid/gclid/utm) and remembers for the whole visit. No
 * separate container, no separate code path: one pipeline, one dimension.
 */

export const TRACKING = {
  /**
   * GA4 — shared with the campaign page on purpose (see above).
   * Every event from here carries site_section=demo-hub.
   */
  ga4MeasurementId: 'G-HY9255GJYE',

  /**
   * Meta Pixel — shared, so the demo-browsing audience is retargetable by the
   * campaign that has to convert it.
   */
  metaPixelId: '1612338809888151',

  /**
   * GTM — THE HUB'S OWN CONTAINER. Empty until one is created.
   *
   * Create a second container in the same GTM account (Admin → Create
   * Container → Web, name it something like "Demu Demo Hub"), then paste its
   * GTM-XXXXXXX id here. Leave it empty and no GTM is loaded at all: GA4 and
   * the Pixel still work on their own, which is the whole measurement stack
   * this hub actually needs. An empty id loads nothing; a WRONG id loads the
   * campaign's tags onto the wrong pages, which is the failure worth avoiding.
   */
  gtmContainerId: '',

  /** Stamped on every event, and the dimension to segment on in GA4. */
  siteSection: 'demo-hub',

  /** Linked from the consent banner, so the answer can be an informed one. */
  privacyUrl: 'https://sayadbayezid.com/privacy-policy.html',

  /**
   * How long a consent answer is honoured before the banner asks again.
   * Six months: long enough not to nag, short enough that a stale "yes" from
   * a year ago is not treated as a current one.
   */
  consentDays: 180,
};

const isSet = (value) => typeof value === 'string' && value.trim().length > 0;

export const hasGa4 = () => isSet(TRACKING.ga4MeasurementId);
export const hasPixel = () => isSet(TRACKING.metaPixelId);
export const hasGtm = () => isSet(TRACKING.gtmContainerId);

/**
 * Everything that has to run before the page paints, as one <head> string.
 *
 * Consent is DENIED here, before a single tag loads, and stays denied until
 * the visitor says otherwise in the banner. That ordering is the whole point:
 * Google Consent Mode only withholds data if the defaults are set before
 * gtag config runs, and the Pixel only withholds it if `consent revoke` is
 * called before any event. Setting either one afterwards measures the visitor
 * first and asks permission second, which is not consent.
 */
export function headSnippet() {
  const parts = [];

  if (hasGa4() || hasGtm()) {
    parts.push(
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
        `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',` +
        `ad_personalization:'denied',analytics_storage:'denied',` +
        `functionality_storage:'granted',security_storage:'granted',wait_for_update:500});` +
        `gtag('set',{site_section:${JSON.stringify(TRACKING.siteSection)}});</script>`,
    );
  }

  if (hasGtm()) {
    parts.push(
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
        `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
        `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);` +
        `})(window,document,'script','dataLayer',${JSON.stringify(TRACKING.gtmContainerId)});</script>`,
    );
  }

  if (hasGa4()) {
    parts.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${TRACKING.ga4MeasurementId}"></script>`,
      // send_page_view is off because hub-track.js reports the page itself,
      // with the traffic_type and demo slug attached. Leaving it on would send
      // a second, thinner page_view alongside every one of those.
      `<script>gtag('js',new Date());gtag('config',${JSON.stringify(TRACKING.ga4MeasurementId)},{send_page_view:false});</script>`,
    );
  }

  if (hasPixel()) {
    parts.push(
      `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
        `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;` +
        `n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;` +
        `s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',` +
        `'https://connect.facebook.net/en_US/fbevents.js');` +
        // revoke BEFORE init: the Pixel queues nothing while revoked, so no
        // PageView leaves the browser until the banner is answered.
        `fbq('consent','revoke');fbq('init',${JSON.stringify(TRACKING.metaPixelId)});</script>`,
    );
  }

  const config = {
    ga4: TRACKING.ga4MeasurementId,
    pixel: TRACKING.metaPixelId,
    gtm: TRACKING.gtmContainerId,
    siteSection: TRACKING.siteSection,
    privacyUrl: TRACKING.privacyUrl,
    consentDays: TRACKING.consentDays,
  };
  parts.push(`<script>window.HUB_TRACKING=${JSON.stringify(config)};</script>`);
  parts.push(`<script src="/assets/hub-track.js" defer></script>`);

  return parts.join('');
}

/** Preconnects worth paying for, and only for tags that actually load. */
export function preconnects() {
  const hosts = [];
  if (hasGa4() || hasGtm()) hosts.push('https://www.googletagmanager.com');
  if (hasPixel()) hosts.push('https://connect.facebook.net');
  return hosts.map((h) => `<link rel="preconnect" href="${h}">`).join('');
}

/** The GTM <noscript> iframe, for the top of <body>. Empty without a container. */
export function bodySnippet() {
  if (!hasGtm()) return '';
  return (
    `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${TRACKING.gtmContainerId}"` +
    ` height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`
  );
}
