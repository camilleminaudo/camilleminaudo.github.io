/* Renders the site from the JSON files in /data.
   You normally never need to edit this file: change the data files instead. */
(() => {
  "use strict";

  // Forel-Ule scale, FU 1–21 (approximate sRGB)
  const FU = ["#2158BC", "#316DC5", "#327CBB", "#4B80A0", "#568F96", "#6D9298", "#698C86",
    "#759E72", "#7BA654", "#7DAE38", "#95B645", "#94B660", "#A5BC76", "#AAB86D", "#ADB55F",
    "#A8A965", "#AE9F5C", "#B39F54", "#AF8A44", "#A46905", "#A14D04"];
  const SELF = /^minaudo\b/i; // how your name appears in author lists
  const PEER = new Set(["article", "chapter", "book"]);
  const LABEL = { proceedings: "Proceedings", preprint: "Preprint", thesis: "Thesis", abstract: "Abstract",
    report: "Report", data: "Dataset", software: "Software", chapter: "Chapter", book: "Book" };

  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  };
  const link = (url, text) => url ? h("a", { href: url, target: /^https?:/.test(url) ? "_blank" : null, rel: "noopener" }, text) : text;

  async function load(name, fallback) {
    if (window.SITE_DATA && name in window.SITE_DATA) return window.SITE_DATA[name];
    try {
      const r = await fetch(`data/${name}.json`, { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.warn(`Could not load data/${name}.json`, e);
      return fallback;
    }
  }

  /* ---------- Forel-Ule band ---------- */
  function renderFU() {
    const band = $("#fu"), cap = $("#fu-caption"), base = cap.textContent;
    FU.forEach((c, i) => {
      const s = h("span", { style: `background:${c}`, tabindex: "0", "aria-label": `Forel-Ule ${i + 1}` });
      const show = () => (cap.textContent = `FU ${i + 1} of 21 — ${i < 5 ? "clear, blue water" : i < 10 ? "greenish-blue, more phytoplankton" : i < 15 ? "green, productive water" : "yellow to brown, sediment and humic matter"}.`);
      s.addEventListener("mouseenter", show); s.addEventListener("focus", show);
      s.addEventListener("mouseleave", () => (cap.textContent = base)); s.addEventListener("blur", () => (cap.textContent = base));
      band.append(s);
    });
  }

  /* ---------- Profile ---------- */
  function renderProfile(p) {
    document.querySelectorAll("[data-bind]").forEach(el => {
      const v = p[el.dataset.bind];
      if (v) el.textContent = v;
    });
    const aff = $('[data-bind="affiliation"]');
    if (aff && p.affiliation_url) aff.href = p.affiliation_url;

    const links = $("#profile-links");
    const all = [...(p.email ? [{ label: "Email", url: `mailto:${p.email}` }] : []), ...(p.links || [])];
    all.filter(l => l.url).forEach(l => links.append(h("li", {}, link(l.url, l.label))));
    if (p.email) $("#footer-contact").append(link(`mailto:${p.email}`, p.email));

    const fig = $("#portrait");
    fig.style.setProperty("--portrait-shadow", FU[4]);
    if (p.portrait) {
      const img = h("img", { src: p.portrait, alt: `Portrait of ${p.name}`, width: "416", height: "520", loading: "eager" });
      img.addEventListener("error", () => img.remove());
      fig.append(img);
    }

    const themes = $("#themes");
    (p.themes || []).forEach(t => themes.append(
      h("article", { class: "theme", style: `--c:${FU[(t.fu || 1) - 1]}` },
        h("h3", {}, t.title), h("p", {}, t.text),
        h("button", { type: "button", onclick: () => showTheme(t.id) }, "See projects"))
    ));

    const bio = $("#bio");
    (p.bio || []).forEach(par => bio.append(h("p", {}, par)));
    const com = $("#community");
    (p.community || []).forEach(c => com.append(h("h3", {}, c.title), h("p", {}, c.text)));

    const pos = $("#positions");
    (p.positions || []).forEach(x => pos.append(h("li", {},
      x.years ? h("span", { class: "years" }, x.years) : null,
      h("span", { class: "title" }, x.title), h("span", { class: "place" }, x.place))));
  }

  /* ---------- Projects ---------- */
  const state = { status: "ongoing", theme: "all" };
  let PROJECTS = [], THEMES = {};

  function showTheme(id) {
    state.theme = id; state.status = "all";
    $("#project-theme").value = id;
    syncSeg("#project-status", "status", "all");
    renderProjects();
    $("#projects").scrollIntoView();
  }

  function syncSeg(sel, key, value) {
    document.querySelectorAll(`${sel} button`).forEach(b => b.setAttribute("aria-pressed", String(b.dataset[key] === value)));
  }

  function renderProjects() {
    const list = $("#project-list");
    list.replaceChildren();
    const rows = PROJECTS.filter(p =>
      (state.status === "all" || p.status === state.status) && (state.theme === "all" || p.theme === state.theme));
    if (!rows.length) { list.append(h("li", { class: "empty" }, "No projects match these filters.")); return; }
    rows.forEach(p => {
      const theme = THEMES[p.theme];
      const meta = [p.acronym, p.years, theme && theme.title, p.status === "completed" ? "Completed" : null].filter(Boolean).join(", ");
      list.append(h("li", { class: "project", style: `--c:${theme ? FU[theme.fu - 1] : "var(--ink-3)"}` },
        h("span", { class: "project__bar", "aria-hidden": "true" }),
        h("div", { class: "project__body" },
          h("div", { class: "project__top" }, h("h3", {}, p.title), h("span", { class: "project__meta" }, meta)),
          h("p", { class: "project__summary" }, p.summary),
          (p.details || p.partners) ? h("details", {}, h("summary", {}, "More"),
            p.details ? h("p", {}, p.details) : null,
            p.partners ? h("p", {}, `Partners: ${p.partners}`) : null) : null,
          (p.links || []).length ? h("div", { class: "project__links" }, p.links.map(l => link(l.url, l.label))) : null)));
    });
  }

  function initProjects(projects, themes) {
    PROJECTS = projects || [];
    themes.forEach(t => (THEMES[t.id] = t));
    const sel = $("#project-theme");
    themes.forEach(t => sel.append(h("option", { value: t.id }, t.title)));
    sel.addEventListener("change", () => { state.theme = sel.value; renderProjects(); });
    document.querySelectorAll("#project-status button").forEach(b => b.addEventListener("click", () => {
      state.status = b.dataset.status; syncSeg("#project-status", "status", state.status); renderProjects();
    }));
    if (!PROJECTS.some(p => p.status === "ongoing")) { state.status = "all"; syncSeg("#project-status", "status", "all"); }
    renderProjects();
  }

  /* ---------- News ---------- */
  function fmtDate(d) {
    const [y, m] = String(d).split("-");
    if (!m) return y;
    return new Date(+y, +m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  function renderNews(news) {
    const list = $("#news-list");
    const items = (news || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!items.length) { $("#news").hidden = true; return; }
    const LIMIT = 5;
    items.forEach((n, i) => list.append(h("li", { hidden: i >= LIMIT ? "" : null },
      h("time", { datetime: n.date }, fmtDate(n.date)),
      h("p", {}, n.text, n.link ? [" ", link(n.link, "Read more")] : null))));
    if (items.length > LIMIT) {
      const btn = h("button", { type: "button", class: "seg", style: "margin-top:1rem;padding:.4rem 1rem;cursor:pointer;font:inherit;font-size:.875rem;color:inherit" }, "Show all news");
      btn.addEventListener("click", () => { list.querySelectorAll("li[hidden]").forEach(li => (li.hidden = false)); btn.remove(); });
      list.after(btn);
    }
  }

  /* ---------- Publications ---------- */
  let PUBS = [], pubFilter = "peer", query = "";
  const isFirst = p => p.authors && p.authors.length && SELF.test(p.authors[0]);

  function pubItem(p) {
    const authors = (p.authors || []);
    let shown = authors;
    if (authors.length > 12) {
      const me = authors.find(a => SELF.test(a));
      const head = authors.slice(0, 10);
      shown = [...head, ...(me && !head.includes(me) ? ["…", me] : []), "…", authors[authors.length - 1]];
    }
    const authorNodes = shown.flatMap((a, i) => [i ? ", " : "", SELF.test(a) ? h("strong", {}, a) : a]);
    const url = p.url || (p.doi ? `https://doi.org/${p.doi}` : null);
    return h("li", { class: "pub" },
      h("p", { class: "pub__title" }, link(url, p.title), LABEL[p.type] && p.type !== "article" ? h("span", { class: "tag" }, LABEL[p.type]) : null),
      authors.length ? h("p", { class: "pub__authors" }, authorNodes) : null,
      h("p", { class: "pub__venue" }, p.journal ? h("em", {}, p.journal) : null, p.journal && p.year ? `, ${p.year}` : p.year || ""));
  }

  function renderPubs() {
    const box = $("#pub-list");
    box.replaceChildren();
    const q = query.trim().toLowerCase();
    const rows = PUBS.filter(p =>
      (pubFilter === "all" || (pubFilter === "peer" && PEER.has(p.type)) || (pubFilter === "first" && isFirst(p))) &&
      (!q || [p.title, p.journal, (p.authors || []).join(" "), p.year].join(" ").toLowerCase().includes(q)));
    if (!rows.length) { box.append(h("p", { class: "empty" }, "No publications match. Try another word or switch to Everything.")); return; }
    const byYear = new Map();
    rows.forEach(p => { const y = p.year || "In press"; if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(p); });
    for (const [y, list] of byYear) box.append(h("section", { class: "pub-year" }, h("h3", {}, y), h("ol", { class: "pubs" }, list.map(pubItem))));
  }

  function initPubs(auto, manual, featured) {
    const seen = new Set();
    PUBS = [...(manual.items || []), ...(auto.items || [])].filter(p => {
      const key = (p.doi || p.title || "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => (b.year || 9999) - (a.year || 9999));

    const peer = PUBS.filter(p => PEER.has(p.type));
    $("#pub-stats").textContent = `${peer.length} peer-reviewed publications, ${peer.filter(isFirst).length} as first author.`;

    const feat = (featured || []).map(d => PUBS.find(p => p.doi && p.doi.toLowerCase() === d.toLowerCase())).filter(Boolean);
    if (feat.length) { $("#featured").hidden = false; $("#featured-list").append(...feat.map(pubItem)); }

    document.querySelectorAll("#pub-filter button").forEach(b => b.addEventListener("click", () => {
      pubFilter = b.dataset.filter; syncSeg("#pub-filter", "filter", pubFilter); renderPubs();
    }));
    let t; $("#pub-search").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { query = e.target.value; renderPubs(); }, 120); });
    renderPubs();

    if (auto.updated) {
      const d = new Date(auto.updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      $("#pub-source").textContent = `Updated automatically from ORCID and Crossref, last on ${d}.`;
      $("#updated").textContent = `Last updated ${d}`;
    }
  }

  /* ---------- Tools ---------- */
  function renderTools(items) {
    const list = $("#tools-list");
    if (!items || !items.length) { $("#tools").hidden = true; return; }
    items.forEach(t => list.append(h("li", {}, h("p", { class: "kind" }, t.kind), h("h3", {}, link(t.url, t.title)), h("p", {}, t.text))));
  }

  /* ---------- Active nav link ---------- */
  function trackNav() {
    const links = [...document.querySelectorAll(".nav a")];
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
    }), { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(a => { const s = $(a.getAttribute("href")); if (s) io.observe(s); });
  }

  /* ---------- Boot ---------- */
  (async () => {
    renderFU();
    const [profile, projects, news, pubs, manual, software] = await Promise.all([
      load("profile", {}), load("projects", []), load("news", []),
      load("publications", { items: [] }), load("publications-manual", { items: [] }), load("software", [])]);
    renderProfile(profile);
    initProjects(projects, profile.themes || []);
    renderNews(news);
    initPubs(pubs, manual, profile.featured_publications);
    renderTools(software);
    trackNav();
  })();
})();
