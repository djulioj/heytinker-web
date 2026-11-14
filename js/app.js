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
  // The margin is small on purpose: on phones the studio sits just below the first screen, and
  // loading three.js during the initial paint would compete with the hero.

  var studioLoaded = false;
  function loadStudio() {
    if (studioLoaded) return;
    studioLoaded = true;
    var s = document.createElement("script");
    s.type = "module";
    s.src = "/js/studio.min.js";
    document.body.appendChild(s);
  }
  var studio = document.querySelector("#configura .config");
  if (studio && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { loadStudio(); obs.disconnect(); }
    }, { rootMargin: "120px 0px" }).observe(studio);
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

    // Real photo when there is one; otherwise our own 3D render, labeled as a reference design.
    var visual = el("div", { class: "card-visual" });
    var src = item.photo || (item.id ? "/assets/catalog/" + item.id + ".webp" : "");
    if (src) {
      var img = el("img", { src: src, alt: item.isConcept ? item.name + ", diseño de referencia" : item.name, width: "800", height: "600", loading: "lazy", decoding: "async" });
      img.addEventListener("error", function () { img.replaceWith(cubeIcon()); });
      visual.appendChild(img);
    } else {
      visual.appendChild(cubeIcon());
    }
    if (item.tag) visual.appendChild(el("span", { class: "tag" }, item.tag));
    if (item.isConcept) visual.appendChild(el("span", { class: "concept" }, "Diseño de referencia"));

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

  // ---------- "Cómo pedir": a pinned scene driven by scroll ----------
  // The piece prints from the bottom up, then lands in its gift box. Without motion (or without JS)
  // the section is a plain three-step list.

  var story = $("como-pedir");
  if (story && !reduceMotion && "IntersectionObserver" in window && window.CSS && CSS.supports("position", "sticky")) {
    document.documentElement.classList.add("js-story");
    var steps = story.querySelectorAll(".story-steps li");
    var ticking = false, storyActive = false;
    var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var updateStory = function () {
      ticking = false;
      var rect = story.getBoundingClientRect();
      var span = rect.height - window.innerHeight;
      var p = span > 0 ? clamp01(-rect.top / span) : 0;
      var print = clamp01((p - 0.1) / 0.5);
      var boxed = clamp01((p - 0.7) / 0.14);
      var step = p < 0.3 ? 0 : p < 0.68 ? 1 : 2;
      story.style.setProperty("--print", print.toFixed(4));
      story.style.setProperty("--boxed", boxed.toFixed(4));
      story.style.setProperty("--nozzle", print > 0.01 && print < 0.99 ? "1" : "0");
      for (var i = 0; i < steps.length; i++) steps[i].classList.toggle("is-active", i === step);
    };
    var onStoryScroll = function () {
      if (storyActive && !ticking) { ticking = true; window.requestAnimationFrame(updateStory); }
    };
    new IntersectionObserver(function (entries) { storyActive = entries[0].isIntersecting; if (storyActive) updateStory(); }).observe(story);
    window.addEventListener("scroll", onStoryScroll, { passive: true });
    window.addEventListener("resize", onStoryScroll, { passive: true });
    updateStory();
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
