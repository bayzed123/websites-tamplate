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
   * The backend. Used for the server half of every Meta event, so a visitor
   * whose Pixel is blocked is still measured.
   */
  apiBase: 'https://bayezid-agency-api.sayadmdbayezidhosan.workers.dev',

  /**
   * MEASUREMENT RUNS BY DEFAULT. Google still asks.
   *
   * This is a deliberate split, and the reasoning is worth writing down
   * because the two halves are not the same kind of thing.
   *
   * Meta's Pixel and the Conversions API are how this business finds out
   * whether the demos produce work — which demo someone opened, how long they
   * stayed, whether they went on to ask for a build. A banner that most
   * visitors dismiss without reading does not produce consent; it produces a
   * measurement gap that makes every campaign decision worse. So Meta runs on
   * arrival, and anyone who does not want it has a real way out (below) rather
   * than a checkbox they had to answer in the first 900ms of a visit.
   *
   * Google Analytics stays behind the banner. Nothing is lost by asking: GA4
   * answers "how many and from where", which is useful and is not what an ad
   * campaign is optimised against.
   *
   * WHAT THIS ASSUMES, STATED PLAINLY. Under EU/UK ePrivacy, advertising
   * pixels need consent before they load, and Meta's Business Tools Terms put
   * that obligation on the site owner rather than on Meta. This setting is
   * right for an audience that is not primarily in those jurisdictions. To
   * restore the gate, set this to false: the banner then covers Meta again and
   * nothing else needs changing.
   */
  metaAlwaysOn: true,

  /**
   * How a visitor turns it off.
   *
   * "Always on" is only defensible with a working way out, so there is one —
   * a link in the banner, a permanent link in the footer, and
   * hubTrack.optOut() for anything else. It stops the Pixel, stops the server
   * events, and is remembered. It is not a dark pattern in the shape of a
   * choice: choosing it removes the tags from the page immediately.
   */
  optOutHash: '#stop-tracking',

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
 * Everything that runs before the page paints — and it reaches no network.
 *
 * WHY NO GOOGLE TAG LOADS HERE. The obvious build of this sets Google Consent
 * Mode to denied, loads gtag.js anyway, and lets the consent signal do the
 * rest. That is "advanced" consent mode, and it is not what "we do not track
 * you unless you say yes" means: with consent denied GA4 still sends a
 * cookieless ping to google-analytics.com on every page, carrying no
 * identifier but telling Google the visit happened so conversions can be
 * modelled. Our own test caught exactly that — a /g/collect with gcs=G100
 * after the visitor had pressed "No thanks".
 *
 * So no Google tag is loaded until the banner is answered. No gtag.js, no GTM,
 * and no preconnect to them either — a preconnect opens a TCP connection and
 * hands over an IP address before anyone agreed to anything, and for a visitor
 * who declines it is pure waste.
 *
 * The cost is real and worth naming: Google gets no modelled conversions for
 * visitors who decline. The alternative is measuring them anyway and calling
 * it consent.
 *
 * META IS DIFFERENT, AND IT IS A CHOICE. With metaAlwaysOn the Pixel and the
 * Conversions API run on arrival rather than waiting for the banner — see the
 * note on that setting above for why, and for the jurisdiction it assumes.
 * They are still not loaded from THIS snippet: assets/hub-track.js does it on
 * boot, so the banner can never delay them and a visitor who has opted out
 * never loads them at all.
 *
 * What does run here is the dataLayer stub and the denied default. Both are
 * local — the stub only queues commands for a library that may never arrive,
 * and the default has to be set before any tag loads or it would not apply to
 * the one we load later.
 */
export function headSnippet() {
  const parts = [];

  parts.push(
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
      `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',` +
      `ad_personalization:'denied',analytics_storage:'denied',` +
      `functionality_storage:'granted',security_storage:'granted'});` +
      `gtag('set',{site_section:${JSON.stringify(TRACKING.siteSection)}});</script>`,
  );

  const config = {
    ga4: TRACKING.ga4MeasurementId,
    pixel: TRACKING.metaPixelId,
    gtm: TRACKING.gtmContainerId,
    siteSection: TRACKING.siteSection,
    privacyUrl: TRACKING.privacyUrl,
    consentDays: TRACKING.consentDays,
    apiBase: TRACKING.apiBase,
    metaAlwaysOn: TRACKING.metaAlwaysOn === true,
    optOutHash: TRACKING.optOutHash,
  };
  parts.push(`<script>window.HUB_TRACKING=${JSON.stringify(config)};</script>`);
  parts.push(`<script src="/assets/hub-track.js" defer></script>`);

  return parts.join('');
}
