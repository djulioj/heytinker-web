(function () {
  "use strict";

  var cfg = window.TINKER;
  if (!cfg) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  var waNumber = /^\d{10,15}$/.test(cfg.whatsapp) ? cfg.whatsapp : null;
  function waUrl(message) {
    return waNumber ? "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message) : "#";
  }

  // ---------- Season ----------

  var seasons = { navidad: "Edición Navidad" };
  if (cfg.season && seasons[cfg.season]) {
    document.documentElement.setAttribute("data-season", cfg.season);
    var badge = $("season-badge");
    if (badge) { badge.textContent = seasons[cfg.season]; badge.hidden = false; }
  }

  // ---------- WhatsApp links ----------

  document.querySelectorAll(".wa-link").forEach(function (a) {
    a.setAttribute("href", waUrl(a.getAttribute("data-wa-msg") || "Hola Tinker"));
  });

  // ---------- 3D studio: load only when it is about to be seen ----------

  var studioLoaded = false;
  function loadStudio() {
    if (studioLoaded) return;
    studioLoaded = true;
    var s = document.createElement("script");
    s.type = "module";
    s.src = "/js/studio.min.js";
    document.body.appendChild(s);
  }
  var studio = $("configura");
  if (studio && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { loadStudio(); obs.disconnect(); }
    }, { rootMargin: "600px 0px" }).observe(studio);
  } else {
    loadStudio();
  }

  function openInStudio(id) {
    window.TINKER_PENDING = id;
    loadStudio();
    window.dispatchEvent(new CustomEvent("tinker:select", { detail: id }));
  }

  // ---------- Catalog ----------

  function cubeIcon() {
    var s = svg("svg", { viewBox: "0 0 64 64", fill: "none", stroke: "#EDEDE8", "stroke-width": "2", "stroke-linejoin": "round", "aria-hidden": "true" });
    s.appendChild(svg("path", { d: "M32 6 L56 19 L56 45 L32 58 L8 45 L8 19 Z" }));
    s.appendChild(svg("path", { d: "M8 19 L32 32 L56 19 M32 32 L32 58" }));
    s.appendChild(svg("path", { d: "M14 36 L32 46 L50 36", stroke: "#FF6A1A", "stroke-width": "2.5" }));
    return s;
  }

  var list = $("catalog");
  cfg.catalog.forEach(function (item) {
    var li = el("li");
    var card = el("article", { class: "card glass" });

    var visual = el("div", { class: "card-visual" });
    visual.appendChild(cubeIcon());
    if (item.tag) visual.appendChild(el("span", { class: "tag" }, item.tag));

    var body = el("div", { class: "card-body" });
    body.appendChild(el("h3", null, item.name));
    body.appendChild(el("p", { class: "desc" }, item.desc));

    var foot = el("div", { class: "card-foot" });
    var price = el("p", { class: "price" });
    price.appendChild(el("small", null, "desde"));
    price.appendChild(document.createTextNode(money.format(item.price)));
    foot.appendChild(price);

    var btn;
    if (item.configId) {
      btn = el("a", { class: "btn btn-glass", href: "#configura" }, "Diseñar");
      btn.addEventListener("click", function () { openInStudio(item.configId); });
    } else {
      btn = el("a", { class: "btn btn-glass", href: waUrl("Hola Tinker, me interesa: " + item.name + ". ¿Me cuentas opciones?"), target: "_blank", rel: "noopener noreferrer" }, "Pedir");
    }
    foot.appendChild(btn);

    card.appendChild(visual);
    card.appendChild(body);
    card.appendChild(foot);
    li.appendChild(card);
    list.appendChild(li);
  });

  // ---------- Bottom tab bar: highlight the section in view ----------

  var tabs = document.querySelectorAll(".tabbar a");
  if (tabs.length && "IntersectionObserver" in window) {
    var tabIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tabs.forEach(function (t) { t.setAttribute("aria-current", String(t.getAttribute("data-tab") === e.target.id)); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["configura", "catalogo", "club", "faq"].forEach(function (id) { var n = $(id); if (n) tabIo.observe(n); });
  }

  // ---------- Scroll reveal (subtle, Apple-like) ----------

  var revealables = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealables.forEach(function (n) { io.observe(n); });
  }
})();
