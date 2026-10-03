// Abandoned checkouts: buyers who typed a phone number (and maybe a player ID) but didn't pay.
import { t, tx, money, dt } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, errMsg, listTable, pill, exportCsv } from "../core.js";

export default async function abandoned(view) {
  const state = { status: "open" };
  view.innerHTML = String(html`<div class="page-head"><h1>${t("abandoned")}</h1><button class="btn" id="csv">${icon("download")} ${t("exportCsv")}</button></div>
    <p class="muted">${tx("Player IDs are masked here. Kept for 30 days, then deleted.", "এখানে প্লেয়ার আইডি আংশিক লুকানো। ৩০ দিন রাখা হয়, তারপর মুছে যায়।")}</p>
    <div class="card"><div class="toolbar"><div class="chips">${[["open", "Open", "খোলা"], ["contacted", "Contacted", "যোগাযোগ হয়েছে"], ["recovered", "Recovered", "অর্ডার হয়েছে"], ["ignored", "Not interested", "আগ্রহী নন"]].map(([v, en, bn]) => html`<button class="chip" data-st="${v}" aria-pressed="${state.status === v}">${tx(en, bn)}</button>`)}</div></div><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    columns: [
      { label: { en: "Buyer", bn: "ক্রেতা" }, render: (r) => html`<b>${r.name ?? "—"}</b><br><a class="mono" href="tel:${r.phone}">${r.phone}</a>` },
      { label: { en: "Wanted", bn: "যা চেয়েছিলেন" }, render: (r) => html`${r.cart.map((c) => html`<div class="small">${c.productName} × ${c.quantity}${c.playerId ? html` · <span class="mono">${c.playerId}</span>` : ""}</div>`)}` },
      { label: { en: "Value", bn: "মূল্য" }, render: (r) => money(r.cart_total), cls: "mono" },
      { label: { en: "Stopped at", bn: "যেখানে থেমেছেন" }, render: (r) => html`${pill("pending", r.last_step)}<br><span class="small muted">${dt(r.updated_at, true)}</span>` },
    ],
    actions: (r) => (can("abandoned.update") ? html`<a class="btn sm wa" href="https://wa.me/${r.phone.replace(/^0/, "880")}" target="_blank" rel="noopener">WhatsApp</a> <button class="btn sm" data-set="contacted" data-id="${r.id}">${tx("Contacted", "যোগাযোগ")}</button> <button class="btn sm" data-set="ignored" data-id="${r.id}">${tx("Not interested", "আগ্রহী নন")}</button>` : ""),
  });
  const load = async () => { table.loading(); try { table.render({ ...(await api(`/abandoned?status=${state.status}`)), page: 1, pages: 1 }); } catch (e) { table.error(e, load); } };
  $$("[data-st]", view).forEach((b) => (b.onclick = () => { state.status = b.dataset.st; $$("[data-st]", view).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); load(); }));
  $("#csv", view).onclick = () => exportCsv(`/abandoned?status=${state.status}`, "abandoned-checkouts").catch((e) => toast(errMsg(e), "err"));
  view.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-set]");
    if (!b) return;
    try { await api(`/abandoned/${b.dataset.id}`, { method: "POST", body: { status: b.dataset.set } }); toast(t("saved")); load(); } catch (err) { toast(errMsg(err), "err"); }
  });
  await load();
}
