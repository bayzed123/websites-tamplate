import { Link } from 'react-router-dom';

import { DEMO } from '../lib/api';

/**
 * The one honest label on the site.
 *
 * Everything below it — the stock counts, the order history, the revenue on
 * the dashboard — is invented, and a prospect clicking through deserves to
 * know that before they read a number and believe it. It is also the only
 * place that explains why the admin needs no password.
 *
 * Deliberately a strip, not a modal: a demo whose first action is to make you
 * dismiss something has already spent the attention it was asking for.
 */
export function DemoBar() {
  if (!DEMO) return null;

  return (
    <div className="demo-bar">
      <div className="wrap">
        <span className="demo-bar-tag">DEMO</span>
        <p>
          A working shop with invented data — nothing here is a real product, order or customer.
          Everything you change lives in this browser and resets on reload.
        </p>
        <Link to="/admin" className="demo-bar-cta">
          Open the admin dashboard — no password
        </Link>
      </div>
    </div>
  );
}
