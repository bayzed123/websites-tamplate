// Browse by game.
import { tx } from "../i18n.js";
import { html, api, loadingBlock, errorBlock, emptyBlock } from "../core.js";
import { gameCard } from "../ui.js";

export default async function games(el) {
  document.title = tx("All games — CWB Gaming", "সব গেম — সিডব্লিউবি গেমিং");
  el.innerHTML = String(html`<div class="container section">${loadingBlock(3)}</div>`);
  try {
    const r = await api("/games");
    const topup = r.items.filter((g) => g.kind === "topup"), cards = r.items.filter((g) => g.kind === "giftcard");
    el.innerHTML = String(html`<div class="container section">
      <h1>${tx("Games", "গেম")}</h1><p class="muted">${tx("Choose a game to see every pack and every seller's price.", "প্রতিটি প্যাক ও সব সেলারের দাম দেখতে একটি গেম বেছে নিন।")}</p>
      ${r.items.length ? "" : emptyBlock("No games yet.", "এখনো কোনো গেম নেই।")}
      ${topup.length ? html`<div class="sec-head" style="margin-top:20px"><h2>${tx("Game top-ups", "গেম টপ-আপ")}</h2></div><div class="games">${topup.map(gameCard)}</div>` : ""}
      ${cards.length ? html`<div class="sec-head" style="margin-top:32px"><h2>${tx("Gift cards & wallet codes", "গিফট কার্ড ও ওয়ালেট কোড")}</h2></div><div class="games">${cards.map(gameCard)}</div>` : ""}
    </div>`);
  } catch (e) { el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); }
}
