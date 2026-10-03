// One game: its packs, each with the lowest live price and the number of sellers.
import { tx, L } from "../i18n.js";
import { html, api, loadingBlock, errorBlock, emptyBlock } from "../core.js";
import { packCard, gameImg } from "../ui.js";

export default async function game(el, { params }) {
  el.innerHTML = String(html`<div class="container section">${loadingBlock(3)}</div>`);
  let r;
  try { r = await api(`/games/${params.slug}`); } catch (e) { el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); return; }
  const g = r.game;
  document.title = `${L(g, "name")} ${tx("top-up", "টপ-আপ")} — CWB Gaming`;
  el.innerHTML = String(html`<div class="container section">
    <div class="game-banner"><img src="${gameImg(g)}" alt=""><div><span class="tag cyan">${g.publisher ?? ""}</span><h1 style="margin:8px 0 4px">${L(g, "name")}</h1>
      <p style="margin:0;max-width:640px">${L(g, "description")}</p></div></div>
    ${g.requires_player_id ? html`<p class="note-box small">${tx("You'll need your", "আপনার লাগবে")} <b>${L(g, "player_id_label") || tx("Player ID", "প্লেয়ার আইডি")}</b>${g.needs_server ? html` + <b>${L(g, "server_label")}</b>` : ""}. ${L(g, "player_id_hint")}</p>` : ""}
    <div class="sec-head" style="margin-top:22px"><h2>${tx("Choose a pack", "প্যাক বেছে নিন")}</h2></div>
    ${r.products.length ? html`<div class="packs">${r.products.map((p) => packCard(p, g))}</div>` : emptyBlock("No packs yet.", "এখনো কোনো প্যাক নেই।")}
  </div>`);
}
