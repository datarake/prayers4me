// Moderation page. Plain JavaScript, no build step. Everything that comes from the server is
// put on the page with textContent (never as HTML), so a request cannot run code here.
const cfg = window.STILLFLAME_ADMIN || {};
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const API = (LOCAL && !cfg.apiUrlOverride ? cfg.localApiUrl : cfg.apiUrl) || "";
const FIREBASE_VERSION = "11.10.0";

const app = document.getElementById("app");
const state = { user: null, tab: "queue", counts: { queue: null, hidden: null }, devName: null, auth: null, fb: null };

// ---- tiny DOM helper ---------------------------------------------------------------------
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (key in node && key !== "list") node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}
const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

let toastTimer;
function toast(text) {
  document.querySelector(".toast")?.remove();
  document.body.append(el("div", { class: "toast", role: "status" }, text));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => document.querySelector(".toast")?.remove(), 3500);
}

// ---- sign-in -----------------------------------------------------------------------------
async function loadFirebase() {
  if (state.fb) return state.fb;
  const fb = cfg.firebase || {};
  if (!fb.apiKey || !fb.appId) return null;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [{ initializeApp }, authMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
  ]);
  const firebaseApp = initializeApp(fb);
  state.fb = { auth: authMod.getAuth(firebaseApp), mod: authMod };
  return state.fb;
}

async function getToken() {
  if (state.devName) return `dev:${state.devName}`;
  const user = state.fb?.auth.currentUser;
  if (!user) throw Object.assign(new Error("Signed out"), { status: 401 });
  return user.getIdToken();
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${await getToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message || `Request failed (${res.status})`), { status: res.status, code: data?.error?.code });
  }
  return data;
}

async function signInWithGoogle() {
  const fb = await loadFirebase();
  if (!fb) return showSignIn("Sign-in is not set up yet. The Firebase web settings are missing.");
  try {
    await fb.mod.signInWithPopup(fb.auth, new fb.mod.GoogleAuthProvider());
  } catch (err) {
    if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") return;
    return showSignIn(`Could not sign in: ${err?.code || err?.message}`);
  }
  await enter();
}

async function signOut() {
  if (state.fb) await state.fb.mod.signOut(state.fb.auth);
  state.devName = null;
  state.user = null;
  showSignIn();
}

// Called once a Google (or local dev) identity exists: does the API accept it as an admin?
async function enter() {
  try {
    await api("/v1/admin/me");
  } catch (err) {
    if (err.status === 403 || err.status === 401) {
      const who = state.fb?.auth.currentUser?.email || state.devName || "this account";
      await signOut();
      return showSignIn(`${who} is not allowed to moderate. Ask an owner to add the address to the admin list.`);
    }
    return showSignIn(`Could not reach the service: ${err.message}`);
  }
  state.user = state.fb?.auth.currentUser?.email || `dev:${state.devName}`;
  render();
}

function showSignIn(message) {
  clear(app);
  const box = el("div", { class: "signin" },
    el("h1", {}, "Moderation"),
    el("p", { class: "adm-sub" }, "For Stillflame moderators. Sign in with your Google account."),
    message ? el("p", { class: "adm-error", role: "alert" }, message) : null,
    el("button", { class: "btn primary", type: "button", onclick: signInWithGoogle }, "Sign in with Google"),
  );
  if (LOCAL) {
    const input = el("input", { type: "text", placeholder: "dev user id", value: "mod", "aria-label": "Dev user id" });
    box.append(el("div", { class: "dev-box" },
      el("p", {}, "Local testing only. This works only against a local API running in dev mode."),
      input,
      el("button", { class: "btn", type: "button", onclick: () => { state.devName = input.value.trim(); enter(); } }, "Dev sign-in"),
    ));
  }
  app.append(box);
}

// ---- layout ------------------------------------------------------------------------------
const TABS = [
  ["queue", "To review"],
  ["hidden", "Hidden"],
  ["metrics", "Health"],
  ["actions", "Activity"],
];

function render() {
  clear(app);
  const tabs = el("div", { class: "adm-tabs", role: "tablist", "aria-label": "Sections" },
    TABS.map(([id, label]) => {
      const count = state.counts[id];
      return el("button", {
        class: "adm-tab", role: "tab", type: "button", id: `tab-${id}`,
        "aria-selected": String(state.tab === id), "aria-controls": "panel",
        onclick: () => { state.tab = id; render(); },
      }, label, count ? el("span", { class: "count" }, `(${count})`) : null);
    }),
  );
  app.append(
    el("header", { class: "adm-header" },
      el("a", { class: "brand", href: "/" }, el("img", { src: "/assets/logo-mark.png", alt: "", width: 28, height: 28 }), el("span", {}, "Still", el("b", {}, "flame"), " moderation")),
      el("div", { class: "who" }, el("span", {}, state.user), el("button", { class: "btn", type: "button", onclick: signOut }, "Sign out")),
    ),
    el("div", { class: "adm-wrap" }, tabs, el("section", { class: "adm-panel", id: "panel", role: "tabpanel", "aria-labelledby": `tab-${state.tab}` })),
  );
  ({ queue: renderQueue, hidden: renderHidden, metrics: renderMetrics, actions: renderActions })[state.tab]();
}

const panel = () => document.getElementById("panel");

async function load(path, into, build) {
  const target = el("div", { class: "adm-body" }, el("p", { class: "adm-sub" }, "Loading"));
  into().append(target);
  try {
    const data = await api(path);
    if (!target.isConnected) return; // the moderator switched tab meanwhile
    clear(target);
    build(target, data);
  } catch (err) {
    if (err.status === 401) return signOut();
    if (!target.isConnected) return;
    clear(target);
    target.append(el("p", { class: "adm-error", role: "alert" }, err.message));
  }
}

// ---- review cards ------------------------------------------------------------------------
const REASONS = { spam: "Spam or ads", scripture_dump: "Long copied text", harassment: "Harassment or hate", off_topic: "Not a prayer request", other: "Something else" };

function requestCard(rawItem, { reported }) {
  // The hidden list does not carry a status field: everything in it is hidden by definition.
  const item = { status: reported ? "active" : "hidden", ...rawItem };
  const note = el("input", { class: "note-input", type: "text", maxLength: 500, placeholder: "Note for the log (optional)", "aria-label": "Note for the log" });
  const card = el("article", { class: "card" });

  async function act(label, path, method = "POST", body) {
    card.classList.add("busy");
    try {
      await api(path, { method, body: body ?? (note.value.trim() ? { note: note.value.trim() } : undefined) });
      card.remove();
      bump();
      toast(label);
    } catch (err) {
      card.classList.remove("busy");
      toast(err.message);
    }
  }

  const chips = el("div", { class: "chips" },
    el("span", { class: "chip" }, item.language.toUpperCase()),
    reported ? el("span", { class: item.report_count >= 3 ? "chip bad" : "chip warn" }, `${item.report_count} report${item.report_count === 1 ? "" : "s"}${item.distinct_networks ? `, ${item.distinct_networks} network${item.distinct_networks === 1 ? "" : "s"}` : ""}`) : null,
    reported && item.status === "hidden" ? el("span", { class: "chip warn" }, "Already hidden") : null,
    item.author_banned ? el("span", { class: "chip bad" }, "Author banned") : null,
    reported ? Object.entries(item.reasons || {}).map(([reason, n]) => el("span", { class: "chip" }, `${REASONS[reason] || reason}: ${n}`)) : null,
  );

  const when = reported ? `Last report ${ago(item.last_report_at)}` : `Hidden ${ago(item.hidden_at)}`;
  const notes = item.notes?.length ? el("ul", { class: "notes", "aria-label": "Notes from reporters" }, item.notes.map((n) => el("li", {}, n))) : null;
  const banForm = el("form", { class: "ban-form hidden", onsubmit: (e) => {
    e.preventDefault();
    const days = Number(duration.value);
    const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    act("Author banned", `/v1/admin/users/${item.author_id}/ban`, "POST", { reason: reason.value.trim(), expiresAt });
  } });
  const reason = el("input", { type: "text", required: true, minLength: 3, maxLength: 500, placeholder: "Reason for the ban (3 to 500 characters)", "aria-label": "Reason for the ban" });
  const duration = el("select", { "aria-label": "Ban length" },
    el("option", { value: "7" }, "7 days"), el("option", { value: "30" }, "30 days"), el("option", { value: "0" }, "Permanent"));
  banForm.append(reason, duration, el("button", { class: "btn danger", type: "submit" }, "Ban author and hide their requests"));

  const actions = el("div", { class: "actions" }, note,
    reported ? el("button", { class: "btn primary", type: "button", onclick: () => act("Kept visible, reports closed", `/v1/admin/requests/${item.id}/dismiss`) }, "Keep visible") : null,
    item.status === "hidden" || !reported ? el("button", { class: "btn primary", type: "button", onclick: () => act("Restored", `/v1/admin/requests/${item.id}/restore`) }, "Restore") : null,
    item.status !== "hidden" ? el("button", { class: "btn", type: "button", onclick: () => act("Hidden", `/v1/admin/requests/${item.id}/hide`) }, "Hide") : null,
    el("button", { class: "btn danger", type: "button", onclick: () => { if (confirm("Remove this request for good? It is erased after 30 days and cannot be restored.")) act("Removed", `/v1/admin/requests/${item.id}/remove`); } }, "Remove"),
    item.author_banned
      ? el("button", { class: "btn", type: "button", onclick: () => { if (confirm("Lift this ban? Their hidden requests stay hidden until you restore them.")) act("Ban lifted", `/v1/admin/users/${item.author_id}/ban`, "DELETE"); } }, "Lift ban")
      : el("button", { class: "btn danger", type: "button", onclick: () => { banForm.classList.toggle("hidden"); if (!banForm.classList.contains("hidden")) reason.focus(); } }, "Ban author…"),
  );

  card.append(
    ...[
      el("div", { class: "card-top" }, el("h2", { class: "card-name" }, item.display_name), el("span", { class: "card-meta" }, when)),
      chips,
      el("p", { class: "card-msg" }, item.message),
      notes,
      actions,
      banForm,
    ].filter(Boolean),
  );
  return card;
}

// After an action the counts in the tab labels are stale, so refresh them.
async function bump() {
  await refreshCounts();
  document.querySelectorAll(".adm-tab").forEach((tab) => {
    const id = tab.id.replace("tab-", "");
    tab.querySelector(".count")?.remove();
    if (state.counts[id]) tab.append(el("span", { class: "count" }, `(${state.counts[id]})`));
  });
  const body = panel()?.querySelector(".adm-body");
  if (body && !body.querySelector(".card") && (state.tab === "queue" || state.tab === "hidden")) {
    clear(body);
    body.append(emptyNote(state.tab));
  }
}

const emptyNote = (tab) => el("div", { class: "adm-empty" }, tab === "queue" ? "Nothing to review. The queue is empty." : "No hidden requests.");

async function refreshCounts() {
  try {
    const [q, h] = await Promise.all([api("/v1/admin/queue"), api("/v1/admin/hidden")]);
    state.counts.queue = q.items.length;
    state.counts.hidden = h.items.length;
  } catch { /* the counts are a convenience */ }
}

function renderQueue() {
  const p = panel();
  p.append(el("h1", {}, "To review"), el("p", { class: "adm-sub" }, "Requests that people reported and nobody has looked at yet. Newest report first. Every decision closes the reports and is written to the activity log."));
  load("/v1/admin/queue", panel, (target, data) => {
    state.counts.queue = data.items.length;
    if (!data.items.length) return target.append(emptyNote("queue"));
    for (const item of data.items) target.append(requestCard(item, { reported: true }));
  });
}

function renderHidden() {
  const p = panel();
  p.append(el("h1", {}, "Hidden"), el("p", { class: "adm-sub" }, "Requests that are out of the feed, hidden by reports or by a moderator. Restore one if it was a mistake."));
  load("/v1/admin/hidden", panel, (target, data) => {
    state.counts.hidden = data.items.length;
    if (!data.items.length) return target.append(emptyNote("hidden"));
    for (const item of data.items) target.append(requestCard(item, { reported: false }));
  });
}

// ---- health ------------------------------------------------------------------------------
function renderMetrics(days = 7) {
  const p = panel();
  const select = el("select", { "aria-label": "Time window", onchange: () => { clear(p); renderMetrics(Number(select.value)); } },
    [7, 30, 90].map((d) => el("option", { value: d, selected: d === days }, `Last ${d} days`)));
  p.append(el("h1", {}, "Health"), el("p", { class: "adm-sub" }, "Is the product working? Computed from the database, with no tracking and no request text."), el("div", { class: "window" }, select));
  const show = (v, unit = "") => (v === null || v === undefined ? "No data yet" : `${v}${unit}`);
  load(`/v1/admin/metrics?days=${days}`, panel, (target, m) => {
    const rows = [
      ["First prayer within a day", show(m.firstPrayerRate24hPercent, "%"), "Share of requests at least a day old that got a prayer within a day. The key number. Aim for 70% or more."],
      ["Requests old enough to judge", show(m.requestsOldEnoughToJudge), "The sample behind the number above."],
      ["Median wait for a first prayer", show(m.medianMinutesToFirstPrayer, " min"), "Under a few hours is healthy."],
      ["Requests created", show(m.requestsCreated), ""],
      ["Prayers", show(m.prayers), ""],
      ["People who asked", show(m.peopleWhoAsked), ""],
      ["People who prayed", show(m.peopleWhoPrayed), "More people praying than asking is healthy."],
      ["Askers who also prayed", show(m.askersWhoAlsoPrayedPercent, "%"), "Should rise over time."],
      ["Reports", show(m.reports), ""],
      ["Reports per request", show(m.reportsPerRequestPercent, "%"), "Low and steady is healthy."],
      ["Requests hidden", show(m.requestsHidden), ""],
    ];
    target.append(el("table", { class: "adm-table" },
      el("thead", {}, el("tr", {}, el("th", {}, "Measure"), el("th", {}, "Value"), el("th", {}, "Meaning"))),
      el("tbody", {}, rows.map(([a, b, c]) => el("tr", {}, el("td", {}, a), el("td", { class: "num" }, b), el("td", { class: "hint" }, c)))),
    ));
  });
}

// ---- activity ----------------------------------------------------------------------------
const ACTION_LABEL = { hide: "Hid a request", restore: "Restored a request", dismiss: "Kept a request visible", remove: "Removed a request", ban: "Banned an author", unban: "Lifted a ban" };

function renderActions() {
  const p = panel();
  p.append(el("h1", {}, "Activity"), el("p", { class: "adm-sub" }, "The latest moderator decisions. The log holds ids and notes only, never request text."));
  load("/v1/admin/actions", panel, (target, data) => {
    if (!data.items.length) return target.append(el("div", { class: "adm-empty" }, "No decisions yet."));
    target.append(el("table", { class: "adm-table" },
      el("thead", {}, el("tr", {}, el("th", {}, "When"), el("th", {}, "Decision"), el("th", {}, "Note"))),
      el("tbody", {}, data.items.map((a) => el("tr", {},
        el("td", { class: "num" }, new Date(a.created_at).toLocaleString()),
        el("td", {}, ACTION_LABEL[a.action] || a.action, el("div", { class: "hint" }, `by ${String(a.admin_id || "deleted account").slice(0, 8)}`)),
        el("td", {}, a.note || ""),
      ))),
    ));
  });
}

// ---- start -------------------------------------------------------------------------------
(async function start() {
  try {
    const fb = await loadFirebase();
    if (fb) {
      await new Promise((resolve) => { const off = fb.mod.onAuthStateChanged(fb.auth, () => { off(); resolve(); }); });
      if (fb.auth.currentUser?.email) { await enter(); await refreshCounts(); if (state.user) render(); return; }
    }
  } catch (err) {
    console.error(err);
  }
  showSignIn();
})();
