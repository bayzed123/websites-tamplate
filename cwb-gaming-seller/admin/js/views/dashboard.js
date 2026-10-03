// Dashboard: guided first-run checklist, Health Check strip, KPIs (GMV today, active sellers, pending applications,
// open disputes, held orders), "Needs your attention today" with one-tap actions, 14-day chart, top games & sellers.
import { tx, num, money, dt, dueIn } from "../i18n.js";
import { html, icon, api, $, can, toast, msg, errMsg, confirmDialog } from "../core.js";

export default async function dashboard(view, { refreshRail }) {
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("Dashboard", "ড্যাশবোর্ড")}</h1>
    ${can("settings.manage") ? html`<button class="btn sm" id="run-jobs">${icon("restore")} ${tx("Run background jobs now", "ব্যাকগ্রাউন্ড কাজ এখন চালান")}</button>` : ""}</div>
    <div id="onboard"></div><div id="health"></div><div id="kpis" class="kpis"></div>
    <div class="split"><section class="card attention" id="attention"><div class="skel"></div></section><section class="card" id="chart"><div class="skel"></div></section></div>
    <div class="split" style="margin-top:16px"><section class="card" id="games"></section><section class="card" id="sellers"></section></div>`);

  const [d, att, health, ob] = await Promise.all([
    api("/dashboard"),
    api("/attention").catch(() => null),
    api("/health").catch(() => null),
    api("/onboarding").catch(() => null),
  ]);
  const k = d.kpis;
  const kpi = (c, ico, label, value, sub) => html`<div class="kpi card" style="--c:var(--${c})"><span class="ico">${icon(ico)}</span><div class="label">${label}</div><div class="value">${value}</div>${sub ? html`<span class="delta muted">${sub}</span>` : ""}</div>`;
  $("#kpis", view).innerHTML = String(html`
    ${kpi("k1", "money", tx("GMV today", "আজকের GMV"), money(k.gmv_today), tx(`yesterday ${money(k.gmv_yesterday)} · ${k.paid_orders_today} paid orders`, `গতকাল ${money(k.gmv_yesterday)} · ${num(k.paid_orders_today)}টি পেইড অর্ডার`))}
    ${kpi("k2", "customers", tx("Active sellers", "সক্রিয় সেলার"), num(k.active_sellers), tx(`commission today ${money(k.commission_today)}`, `আজকের কমিশন ${money(k.commission_today)}`))}
    ${kpi("k3", "staff", tx("Pending applications", "অপেক্ষমাণ আবেদন"), num(k.pending_applications))}
    ${kpi("k4", "alert", tx("Open disputes", "চলমান বিরোধ"), num(k.open_disputes))}
    ${kpi("k5", "orders", tx("Held orders", "আটকে থাকা অর্ডার"), num(k.held_orders), tx(`${k.overdue_lines} late deliveries · ${k.payments_to_confirm} payments to check`, `${num(k.overdue_lines)}টি দেরিতে ডেলিভারি · ${num(k.payments_to_confirm)}টি পেমেন্ট যাচাই`))}
    ${kpi("k6", "money", tx("Payouts waiting", "অপেক্ষমাণ পেআউট"), money(k.payouts_pending))}`);

  if (ob && !ob.dismissed && ob.done < ob.total) {
    $("#onboard", view).innerHTML = String(html`<section class="card onboard" style="margin-bottom:16px"><div class="card-title"><h2>${tx("Get the marketplace ready", "মার্কেটপ্লেস প্রস্তুত করুন")} · ${num(ob.done)}/${num(ob.total)}</h2>${can("settings.manage") ? html`<button class="btn sm ghost" id="ob-hide">${tx("Hide", "লুকান")}</button>` : ""}</div>
      <ol>${ob.steps.map((s, i) => html`<li class="${s.done ? "done" : ""}"><span class="tick">${s.done ? "✓" : num(i + 1)}</span><a href="${s.link}">${tx(s.en, s.bn)}</a></li>`)}</ol></section>`);
    $("#ob-hide", view)?.addEventListener("click", async () => { await api("/onboarding/dismiss", { method: "POST" }).catch(() => {}); $("#onboard", view).innerHTML = ""; });
  }
  if (health) {
    $("#health", view).innerHTML = String(html`<section class="card health" style="margin-bottom:16px"><div class="card-title"><h2>${tx("Health check", "হেলথ চেক")}</h2><span class="pill ${health.environment === "production" ? "active" : "pending"}">${health.environment}</span></div>
      <ul>${health.checks.map((c) => html`<li><span class="led ${c.status === "ok" ? "ok" : c.status === "warn" ? "partial" : ""}"></span><span>${tx(c.en, c.bn)}</span></li>`)}</ul></section>`);
  }

  const groups = att?.groups.filter((g) => g.items.length) ?? [];
  const row = (g, it) => {
    switch (g.key) {
      case "held": return html`<div class="att-row"><a class="att-main" href="#/orders/${it.id}"><b class="mono">${it.order_no}</b> · ${money(it.total)} · ${tx((JSON.parse(it.hold_reason || "[]")[0] ?? {}).en ?? "", (JSON.parse(it.hold_reason || "[]")[0] ?? {}).bn ?? "")}</a>${can("orders.release") ? html`<button class="btn sm primary" data-release="${it.id}">${tx("Release", "রিলিজ")}</button>` : ""}</div>`;
      case "payments": return html`<div class="att-row"><a class="att-main" href="#/orders/${it.id}"><b class="mono">${it.order_no}</b> · ${it.payment_method} · ${money(it.total)} · TrxID <span class="mono">${it.payment_trx_claimed}</span></a><a class="btn sm" href="#/orders/${it.id}">${tx("Check & confirm", "যাচাই ও নিশ্চিত")}</a></div>`;
      case "overdue": return html`<div class="att-row"><a class="att-main" href="#/orders/${it.order_id}"><b class="mono">${it.order_no}</b> · ${it.sku} · ${it.store_name} · <span class="sla-late">${dueIn(it.sla_due_at)}</span></a><a class="btn sm" href="#/orders/${it.order_id}">${tx("Reassign", "অন্য সেলারকে দিন")}</a></div>`;
      case "applications": return html`<div class="att-row"><a class="att-main" href="#/applications/${it.id}"><b>${it.store_name}</b> · ${it.code} · ${dt(it.submitted_at, true)}</a><a class="btn sm" href="#/applications/${it.id}">${tx("Review", "যাচাই")}</a></div>`;
      case "disputes": return html`<div class="att-row"><a class="att-main" href="#/disputes?id=${it.id}"><b class="mono">${it.dispute_no}</b> · ${it.order_no} · ${it.reason}</a><a class="btn sm" href="#/disputes?id=${it.id}">${tx("Decide", "সিদ্ধান্ত")}</a></div>`;
      case "payouts": return html`<div class="att-row"><a class="att-main" href="#/payouts?id=${it.id}"><b class="mono">${it.payout_no}</b> · ${it.store_name} · ${money(it.amount)}</a>${can("payouts.decide") ? html`<a class="btn sm primary" href="#/payouts?id=${it.id}">${tx("Pay out", "পেআউট")}</a>` : ""}</div>`;
      case "fraud": return html`<div class="att-row"><a class="att-main" href="#/fraud">${it.kind} · ${tx(it.reason_en, it.reason_bn)}</a></div>`;
      default: {
        const why = JSON.parse(it.standing_reason || "null");
        return html`<div class="att-row"><a class="att-main" href="#/sellers/${it.id}"><b>${it.store_name}</b> · ${it.code}${why ? html` · ${tx(why.en, why.bn)}` : ""}</a></div>`;
      }
    }
  };
  $("#attention", view).innerHTML = String(html`<h2>${tx("Needs your attention today", "আজ আপনার মনোযোগ দরকার")} <span class="n pill">${num(att?.total ?? 0)}</span></h2>
    ${groups.length ? groups.map((g) => html`<div class="att-group"><h3 style="margin:14px 0 8px">${tx(g.en, g.bn)} · ${num(g.items.length)}</h3>${g.items.slice(0, 6).map((it) => row(g, it))}</div>`) : html`<p class="muted">${tx("All clear — nothing is waiting for you.", "সব ঠিক আছে — কিছু আপনার অপেক্ষায় নেই।")}</p>`}`);

  const max = Math.max(1, ...d.daily.map((x) => x.gmv));
  $("#chart", view).innerHTML = String(html`<h2>${tx("Net sales, last 14 days", "নিট বিক্রি, গত ১৪ দিন")}</h2>
    ${d.daily.length ? html`<div class="bar-chart" style="margin-bottom:24px">${d.daily.map((x) => html`<div style="height:${Math.round((x.gmv / max) * 100)}%" title="${x.day}: ${money(x.gmv)} · ${x.orders}"><span>${x.day.slice(8)}</span></div>`)}</div>` : html`<p class="muted">${tx("No paid orders yet.", "এখনো কোনো পেইড অর্ডার নেই।")}</p>`}
    <h3>${tx("Payment methods (30 days)", "পেমেন্ট পদ্ধতি (৩০ দিন)")}</h3>${d.paymentMix.map((m) => html`<div class="spread small"><span>${m.payment_method}</span><span class="mono">${num(m.n)} · ${money(m.amount)}</span></div>`)}`);
  $("#games", view).innerHTML = String(html`<h2>${tx("Top games (30 days)", "শীর্ষ গেম (৩০ দিন)")}</h2>${d.topGames.length ? d.topGames.map((g) => html`<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--line-soft)"><span>${g.game_name}</span><span class="mono">${num(g.lines)} · ${money(g.gmv)}</span></div>`) : html`<p class="muted">—</p>`}`);
  $("#sellers", view).innerHTML = String(html`<h2>${tx("Top sellers (30 days)", "শীর্ষ সেলার (৩০ দিন)")}</h2>${d.topSellers.length ? d.topSellers.map((s) => html`<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--line-soft)"><span>${s.code} · ${s.store_name} <span class="pill ${s.standing}">${s.standing}</span></span><span class="mono">${num(s.lines)} · ${money(s.gmv)}</span></div>`) : html`<p class="muted">—</p>`}`);

  view.addEventListener("click", async (e) => {
    const r = e.target.closest("[data-release]");
    if (r) {
      if (!(await confirmDialog(tx("Release this order? Codes are delivered at once.", "অর্ডারটি রিলিজ করবেন? কোড সাথে সাথে ডেলিভারি হবে।"), { danger: false }))) return;
      try { toast(msg(await api(`/orders/${r.dataset.release}/release`, { method: "POST", body: {} }))); r.closest(".att-row").remove(); refreshRail?.(); } catch (err) { toast(errMsg(err), "err"); }
    }
    if (e.target.closest("#run-jobs")) {
      try { const x = await api("/jobs/run", { method: "POST" }); toast(`${msg(x)} ${Object.entries(x.result).filter(([, v]) => v).map(([a, b]) => `${a}: ${b}`).join(", ")}`); } catch (err) { toast(errMsg(err), "err"); }
    }
  });
}
