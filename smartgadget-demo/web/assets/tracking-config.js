/**
 * SmartGadget demo — every tracking identifier, in one file.
 *
 * WHY THIS FILE EXISTS AT ALL
 * The real store this demo is modelled on runs live ads. Its GA4 property,
 * GTM container and Meta Pixel are measuring money. If a demo that anyone can
 * open were to fire into those, every click from a prospect browsing the
 * showcase would land in the real store's conversion data and quietly poison
 * the optimisation of campaigns that are spending budget right now.
 *
 * So the demo gets its OWN container. Same stack, separate measurement:
 * a second GA4 property, a second GTM container, a second Pixel.
 *
 * HOW TO SWITCH IT ON
 * Create the three demo properties in the same accounts, then paste their ids
 * below. Until you do, every id here is empty and the tracking code does
 * nothing at all — no tag is loaded, no event is sent. That is deliberate:
 * an empty id is a demo that measures nothing, and a WRONG id is a demo that
 * corrupts the live store's reporting. Empty is the safe default.
 */
export const TRACKING = {
  /** GA4 for the demo only. Looks like "G-XXXXXXXXXX". */
  ga4MeasurementId: '',

  /** GTM for the demo only. Looks like "GTM-XXXXXXX". */
  gtmContainerId: '',

  /** Meta Pixel for the demo only. A 15-16 digit number, as a string. */
  metaPixelId: '',

  /**
   * Where the server-side copy of an event is posted.
   *
   * The Conversions API needs a server, and this demo deliberately has none —
   * that is what makes an admin dashboard with no password safe to publish.
   * So this is empty and the server-side copy is simply not sent.
   *
   * Point it at a demo Worker's /api/track when you want the full dual
   * delivery. The browser already generates and sends an `eventID` on the
   * events that support it, so Meta will deduplicate the pair correctly the
   * moment a server copy starts arriving.
   */
  capiEndpoint: '',

  /** Reported currency. The demo's fixture prices are in Bangladeshi taka. */
  currency: 'BDT',
};

// The live store's own GA4, GTM and Pixel ids are deliberately NOT written
// here, not even as a "do not use" list: a file that names them is a file
// that contains them, and the isolation check greps this whole demo for
// exactly those strings. They live in tests/demo-isolation.mjs instead.
