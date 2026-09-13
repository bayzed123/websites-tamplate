/**
 * The measurement IDs this demo reports to, in one place.
 *
 * These are the agency's own properties, not a client's — the demo is a piece
 * of the agency's portfolio and its traffic belongs in the agency's reports.
 * The same three IDs are repeated in index.html, because the GTM, gtag and
 * Pixel bootstrap snippets have to run before the bundle loads; this file is
 * what the application code reads, and the comment above each ID is the
 * reminder to change both together.
 */

/** Google Tag Manager container. Mirrored in index.html. */
export const GTM_CONTAINER_ID = 'GTM-WN9DK67S';

/** GA4 measurement ID. Mirrored in index.html. */
export const GA_MEASUREMENT_ID = 'G-HY9255GJYE';

/** Meta Pixel. Mirrored in index.html. */
export const META_PIXEL_ID = '1612338809888151';

/**
 * Stamped on every event this build sends.
 *
 * WHY IT MATTERS. This is a demonstration shop: its orders are invented and
 * its checkout takes no money. Those events land in the same GA4 property and
 * the same Pixel as the agency's real site, so without a marker they would
 * quietly inflate the conversion numbers that real ad spend is judged on.
 *
 * In GA4, filter or segment on the `demo_site` event parameter. In Meta Ads
 * Manager the demo never sends a standard conversion event at all — see
 * `demoSafeEvent` in ./analytics.ts for why.
 */
export const DEMO_SITE_TAG = 'smartgadget-demo';
