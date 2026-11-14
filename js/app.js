(function () {
  "use strict";

  var cfg = window.TINKER;
  if (!cfg) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  // ---------- Helpers ----------

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  // User text is only ever written with textContent and URL-encoded; this also strips
  // control characters and caps length so messages stay clean.
  function cleanText(value, max) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F-\u009F<>]/g, "")
      .replace(/\s+/g, " ")
      .replace(/^\s+/, "")
      .slice(0, max);
  }

  function clampQty(value) {
    var n = parseInt(value, 10);
    if (!isFinite(n) || n < 1) return 1;
    return Math.min(n, 200);
  }

  // Shades a hex color toward black to fake the extruded side of a 3D print.
  function shade(hex, amount) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * (1 - amount));
    var g = Math.round(((n >> 8) & 255) * (1 - amount));
    var b = Math.round((n & 255) * (1 - amount));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  var waNumber = /^\d{10,15}$/.test(cfg.whatsapp) ? cfg.whatsapp : null;

  function waUrl(message) {
    if (!waNumber) return "#";
    return "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message);
  }

  function colorById(id) {
    for (var i = 0; i < cfg.colors.length; i++) if (cfg.colors[i].id === id) return cfg.colors[i];
    return cfg.colors[0];
  }

  function productById(id) {
    for (var i = 0; i < cfg.configurable.length; i++) if (cfg.configurable[i].id === id) return cfg.configurable[i];
    return cfg.configurable[0];
  }

  function unitPrice(product, qty) {
    var unit = product.tiers[0].unit;
    product.tiers.forEach(function (t) { if (qty >= t.min) unit = t.unit; });
    return unit;
  }

  // ---------- Static links ----------

  document.querySelectorAll(".wa-link").forEach(function (a) {
    a.setAttribute("href", waUrl(a.getAttribute("data-wa-msg") || "Hola Tinker"));
  });
  document.querySelectorAll("[data-cutoff]").forEach(function (n) { n.textContent = cfg.orderCutoff; });

  // ---------- Configurator state ----------

  var state = {
    product: cfg.configurable[0].id,
    text: "",
    subline: "",
    base: "negro",
    ink: "naranja",
    qty: 1
  };

  var textInput = $("cfg-text");
  var subInput = $("cfg-sub");
  var qtyInput = $("cfg-qty");

  function buildProductChips() {
    var wrap = $("product-chips");
    cfg.configurable.forEach(function (p) {
      var b = el("button", { type: "button", "data-id": p.id, "aria-pressed": "false" }, p.name.replace(" con nombre", ""));
      b.addEventListener("click", function () { selectProduct(p.id); });
      wrap.appendChild(b);
    });
  }

  function buildSwatches(containerId, key) {
    var wrap = $(containerId);
    cfg.colors.forEach(function (c) {
      var b = el("button", { type: "button", class: "swatch", "data-id": c.id, "aria-label": c.name, "aria-pressed": "false", title: c.name });
      b.style.background = c.hex;
      b.addEventListener("click", function () { state[key] = c.id; render(); });
      wrap.appendChild(b);
    });
  }

  function selectProduct(id) {
    var p = productById(id);
    state.product = p.id;
    textInput.maxLength = p.maxChars;
    textInput.placeholder = p.placeholder;
    state.text = cleanText(state.text, p.maxChars);
    textInput.value = state.text;
    var sub = $("subline-field");
    if (p.subline) {
      sub.hidden = false;
      subInput.maxLength = p.subline.maxChars;
      subInput.placeholder = p.subline.placeholder;
    } else {
      sub.hidden = true;
    }
    render();
  }

  // ---------- Preview drawing (pure SVG, no HTML injection) ----------

  function fitText(node, maxWidth, startSize, minSize) {
    var size = startSize;
    node.setAttribute("font-size", size);
    var len = node.getComputedTextLength();
    if (len > maxWidth) {
      size = Math.max(minSize, Math.floor(size * (maxWidth / len)));
      node.setAttribute("font-size", size);
    }
    return size;
  }

  // Draws the same text twice: a darker copy offset downward reads as print thickness.
  function extrudedText(group, label, x, y, color, opts) {
    var common = {
      x: x, y: y, "text-anchor": "middle", "dominant-baseline": "central",
      "font-family": "Space Mono, monospace", "font-weight": "700", "letter-spacing": "-1"
    };
    var side = svg("text", Object.assign({}, common, { fill: shade(color, 0.45), transform: "translate(0 5)" }), label);
    var face = svg("text", Object.assign({}, common, { fill: color }), label);
    if (opts && opts.stroke) {
      [side, face].forEach(function (t) {
        t.setAttribute("stroke", opts.stroke);
        t.setAttribute("stroke-width", opts.strokeWidth);
        t.setAttribute("stroke-linejoin", "round");
        t.setAttribute("paint-order", "stroke");
      });
      side.setAttribute("stroke", shade(opts.stroke, 0.45));
    }
    group.appendChild(side);
    group.appendChild(face);
    var size = fitText(face, opts.maxWidth, opts.size, opts.minSize || 18);
    side.setAttribute("font-size", size);
    return face;
  }

  function drawPreview() {
    var stage = $("preview");
    var p = productById(state.product);
    var base = colorById(state.base).hex;
    var ink = colorById(state.ink).hex;
    var label = state.text.trim() || p.placeholder;

    var root = svg("svg", { viewBox: "0 0 400 300", "aria-hidden": "true" });
    root.appendChild(svg("ellipse", { cx: 200, cy: 262, rx: 150, ry: 14, fill: "rgba(0,0,0,0.45)" }));
    var g = svg("g");
    root.appendChild(g);
    stage.replaceChildren(root);

    if (p.id === "llavero") {
      g.appendChild(svg("rect", { x: 40, y: 103, width: 320, height: 110, rx: 55, fill: shade(base, 0.45) }));
      g.appendChild(svg("rect", { x: 40, y: 95, width: 320, height: 110, rx: 55, stroke: "rgba(255,255,255,0.14)", "stroke-width": 1.5, fill: base }));
      g.appendChild(svg("circle", { cx: 92, cy: 150, r: 15, fill: "#121214" }));
      g.appendChild(svg("circle", { cx: 72, cy: 150, r: 38, fill: "none", stroke: "#B8B8BE", "stroke-width": 6 }));
      extrudedText(g, label, 222, 148, ink, { maxWidth: 220, size: 64 });
    } else if (p.id === "bola") {
      g.appendChild(svg("circle", { cx: 200, cy: 160, r: 100, fill: shade(base, 0.45), transform: "translate(0 7)" }));
      g.appendChild(svg("circle", { cx: 200, cy: 160, r: 100, stroke: "rgba(255,255,255,0.14)", "stroke-width": 1.5, fill: base }));
      g.appendChild(svg("rect", { x: 182, y: 46, width: 36, height: 22, rx: 5, fill: "#C9A227" }));
      g.appendChild(svg("path", { d: "M200 46 C190 28, 210 22, 206 40", fill: "none", stroke: "#B8B8BE", "stroke-width": 4 }));
      g.appendChild(svg("circle", { cx: 160, cy: 118, r: 18, fill: "rgba(255,255,255,0.12)" }));
      extrudedText(g, label, 200, 164, ink, { maxWidth: 170, size: 56 });
    } else if (p.id === "letrero") {
      var sub = state.subline.trim() || (p.subline && p.subline.placeholder) || "";
      g.appendChild(svg("path", { d: "M40 228 L360 228 L340 98 L60 98 Z", fill: shade(base, 0.5) }));
      g.appendChild(svg("rect", { x: 50, y: 88, width: 300, height: 128, rx: 12, stroke: "rgba(255,255,255,0.14)", "stroke-width": 1.5, fill: base }));
      extrudedText(g, label, 200, 136, ink, { maxWidth: 260, size: 44 });
      var s = svg("text", { x: 200, y: 182, "text-anchor": "middle", "dominant-baseline": "central", "font-family": "Inter, sans-serif", "font-weight": "500", fill: ink, opacity: 0.85 }, sub);
      g.appendChild(s);
      fitText(s, 260, 20, 12);
    } else {
      g.appendChild(svg("rect", { x: 150, y: 170, width: 8, height: 90, rx: 4, fill: base }));
      g.appendChild(svg("rect", { x: 242, y: 170, width: 8, height: 90, rx: 4, fill: base }));
      extrudedText(g, label, 200, 128, ink, { maxWidth: 320, size: 76, stroke: base, strokeWidth: 16 });
    }
  }

  // ---------- Render ----------

  function render() {
    var p = productById(state.product);
    var qty = state.qty;
    var unit = unitPrice(p, qty);
    var total = unit * qty;

    document.querySelectorAll("#product-chips button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-id") === state.product));
    });
    document.querySelectorAll("#base-swatches .swatch").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-id") === state.base));
    });
    document.querySelectorAll("#text-swatches .swatch").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-id") === state.ink));
    });

    $("base-name").textContent = colorById(state.base).name;
    $("text-name").textContent = colorById(state.ink).name;
    $("contrast-warn").hidden = state.base !== state.ink;
    $("cfg-count").textContent = "(" + state.text.length + "/" + p.maxChars + ")";
    $("cfg-total").textContent = money.format(total);
    $("cfg-unit").textContent = qty > 1 ? money.format(unit) + " c/u" : "";
    $("cfg-note").textContent = p.note || "";
    qtyInput.value = qty;

    drawPreview();

    var lines = [
      "Hola Tinker, quiero hacer este pedido:",
      "- Producto: " + p.name,
      "- Texto: " + (state.text.trim() || "(por definir)")
    ];
    if (p.subline) lines.push("- Segunda línea: " + (state.subline.trim() || "(por definir)"));
    lines.push(
      "- Colores: base " + colorById(state.base).name + ", texto " + colorById(state.ink).name,
      "- Cantidad: " + qty,
      "- Total estimado: " + money.format(total),
      "",
      "Mi ciudad para el envío es: "
    );
    $("cfg-send").setAttribute("href", waUrl(lines.join("\n")));
  }

  // ---------- Events ----------

  textInput.addEventListener("input", function () {
    state.text = cleanText(textInput.value, productById(state.product).maxChars);
    if (textInput.value !== state.text) textInput.value = state.text;
    render();
  });
  subInput.addEventListener("input", function () {
    var p = productById(state.product);
    state.subline = cleanText(subInput.value, p.subline ? p.subline.maxChars : 24);
    render();
  });
  qtyInput.addEventListener("change", function () { state.qty = clampQty(qtyInput.value); render(); });
  $("qty-minus").addEventListener("click", function () { state.qty = clampQty(state.qty - 1); render(); });
  $("qty-plus").addEventListener("click", function () { state.qty = clampQty(state.qty + 1); render(); });
  $("config-form").addEventListener("submit", function (e) { e.preventDefault(); });

  // ---------- Catalog ----------

  function cubeIcon() {
    var s = svg("svg", { viewBox: "0 0 64 64", fill: "none", stroke: "#EDEDE8", "stroke-width": "2", "stroke-linejoin": "round", "aria-hidden": "true" });
    s.appendChild(svg("path", { d: "M32 6 L56 19 L56 45 L32 58 L8 45 L8 19 Z" }));
    s.appendChild(svg("path", { d: "M8 19 L32 32 L56 19 M32 32 L32 58" }));
    s.appendChild(svg("path", { d: "M14 36 L32 46 L50 36", stroke: "#FF6A1A", "stroke-width": "2.5" }));
    return s;
  }

  function buildCatalog() {
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
        btn = el("a", { class: "btn btn-glass", href: "#configura" }, "Personalizar");
        btn.addEventListener("click", function () { selectProduct(item.configId); });
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
  }

  // ---------- Init ----------

  buildProductChips();
  buildSwatches("base-swatches", "base");
  buildSwatches("text-swatches", "ink");
  buildCatalog();
  selectProduct(state.product);

  // Re-measure text once the brand font has loaded so the preview fits correctly.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
