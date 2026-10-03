// Search: games, packs and sellers.
import { tx, L, money } from "../i18n.js";
import { html, api, loadingBlock, errorBlock, emptyBlock } from "../core.js";
import { gameCard, sellerCard } from "../ui.js";

export default async function search(el, { query }) {
  const q = (query.get("q") ?? "").trim();
  document.title = `${tx("Search", "খুঁজুন")}: ${q} — CWB Gaming`;
  el.innerHTML = String(html`<div class="container section">${loadingBlock(3)}</div>`);
  try {
    const r = await api(`/search?q=${encodeURIComponent(q)}`);
    const none = !r.games.length && !r.products.length && !r.sellers.length;
    el.innerHTML = String(html`<div class="container section"><h1>${tx("Results for", "ফলাফল")} “${q}”</h1>
      ${none ? emptyBlock("Nothing found. Try a game name like “PUBG” or “Free Fire”.", "কিছু পাওয়া যায়নি। “PUBG” বা “Free Fire” এর মতো গেমের নাম লিখে দেখুন।") : ""}
      ${r.games.length ? html`<div class="sec-head"><h2>${tx("Games", "গেম")}</h2></div><div class="games">${r.games.map(gameCard)}</div>` : ""}
      ${r.products.length ? html`<div class="sec-head" style="margin-top:24px"><h2>${tx("Packs", "প্যাক")}</h2></div><div class="packs">${r.products.map((p) => html`<a class="pack" href="/topup/${p.game_slug}/${p.slug}"><span class="small muted">${L(p, "game_name")}</span><span class="amount">${L(p, "name")}</span><span class="price">${p.min_price != null ? html`${tx("from", "শুরু")} ${money(p.min_price)}` : tx("No offers yet", "এখনো অফার নেই")}</span></a>`)}</div>` : ""}
      ${r.sellers.length ? html`<div class="sec-head" style="margin-top:24px"><h2>${tx("Sellers", "সেলার")}</h2></div><div class="sellers">${r.sellers.map(sellerCard)}</div>` : ""}</div>`);
  } catch (e) { el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); }
}
