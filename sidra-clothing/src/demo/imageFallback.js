/**
 * A stand-in for a product photo the CDN did not give us.
 *
 * Every product image in this catalogue is hotlinked from images.asos-media.com.
 * That is someone else's CDN: it can rate-limit, block hotlinking from a new
 * origin, or simply be unreachable from wherever the demo is being viewed. When
 * that happens the shop fills with broken-image icons, which is worse than any
 * placeholder — and it is what the deploy's own preview check flags.
 *
 * `onError` fires once per element; clearing the handler first stops a loop if
 * the data URI itself were ever rejected.
 */
const TILE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">' +
      '<rect width="600" height="800" fill="#efece7"/>' +
      '<path d="M232 330h136v34l-24 210h-88l-24-210z" fill="#d8d2c8"/>' +
      '<circle cx="300" cy="300" r="46" fill="#d8d2c8"/>' +
      '<text x="300" y="640" font-family="system-ui,sans-serif" font-size="24" fill="#9c958a" text-anchor="middle">Image unavailable</text>' +
      '</svg>',
  );

export function onImageError(event) {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = TILE;
}
