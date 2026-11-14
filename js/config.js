// Business settings and catalog data. Edit this file to change prices, products, contact info or the season.
window.TINKER = {
  // WhatsApp Business number in international format, digits only (57 + 10-digit mobile).
  whatsapp: "573239085769",
  instagram: "heytinker.co",

  // Seasonal decoration: "navidad" or "" (none). Add new seasons in css/season.css.
  season: "navidad",

  // Filament colors offered in the studio: exactly the spools in stock.
  // Logo colors are snapped to the closest of these. To add or retire a color, edit this list only.
  colors: [
    { id: "negro", name: "Negro", hex: "#141416" },
    { id: "blanco", name: "Blanco", hex: "#F2F2EE" },
    { id: "crema", name: "Crema", hex: "#E8DCC0" },
    { id: "gris", name: "Gris", hex: "#8A8A90" },
    { id: "rojo", name: "Rojo", hex: "#C8102E" },
    { id: "azul", name: "Azul cobalto", hex: "#1747B5" },
    { id: "verde", name: "Verde", hex: "#2E9B47" },
    { id: "verde-navidad", name: "Verde navidad", hex: "#0E4D2B" },
    { id: "naranja", name: "Naranja", hex: "#FF6A1A" },
    { id: "morado", name: "Morado", hex: "#5B3FA8" },
    { id: "cafe", name: "Café", hex: "#5A3A22" }
  ],

  // Products in the 3D studio.
  // mode: "text" (name pieces), "logo" (customer image as multicolor relief), "litho" (photo lithophane),
  // "relief" (photo sculpted as a single-color plaque).
  // tiers: unit price by minimum quantity.
  configurable: [
    {
      id: "llavero", mode: "text", shape: "keychain", name: "Llavero con nombre", short: "Llavero",
      maxChars: 10, placeholder: "Sofía",
      tiers: [{ min: 1, unit: 13000 }, { min: 5, unit: 11000 }, { min: 10, unit: 10000 }],
      note: "Pack x5 a $55.000 · x10 a $100.000. Ideal para amigo secreto."
    },
    {
      id: "logo", mode: "logo", name: "Llavero con tu logo o dibujo", short: "Tu logo",
      tiers: [{ min: 1, unit: 18000 }, { min: 10, unit: 14000 }, { min: 50, unit: 10000 }],
      note: "Hasta 4 colores. Precio por volumen para empresas y eventos."
    },
    {
      id: "litofania", mode: "litho", name: "Litofanía con foto + luz LED", short: "Litofanía",
      tiers: [{ min: 1, unit: 80000 }],
      note: "Incluye base con luz LED. La foto aparece al encenderla."
    },
    {
      id: "placa", mode: "relief", name: "Placa en relieve con tu foto", short: "Placa relieve",
      tiers: [{ min: 1, unit: 45000 }],
      note: "Tu foto esculpida en un solo color, con base para escritorio."
    },
    {
      id: "bola", mode: "text", shape: "ornament", name: "Bola navideña con nombre", short: "Bola navideña",
      maxChars: 9, placeholder: "Mateo",
      tiers: [{ min: 1, unit: 15000 }, { min: 4, unit: 12500 }],
      note: "Set familiar x4 a $50.000."
    },
    {
      id: "letrero", mode: "text", shape: "sign", name: "Letrero de escritorio", short: "Letrero",
      maxChars: 16, placeholder: "Ana Torres",
      subline: { placeholder: "Gerente de Diseño", maxChars: 24 },
      tiers: [{ min: 1, unit: 35000 }, { min: 5, unit: 30000 }],
      note: "Nombre y cargo. Precio especial para equipos desde 5 unidades."
    },
    {
      id: "topper", mode: "text", shape: "topper", name: "Cake topper", short: "Cake topper",
      maxChars: 14, placeholder: "Feliz 30",
      tiers: [{ min: 1, unit: 20000 }],
      note: "Para cumpleaños, cenas y celebraciones."
    }
  ],

  // Catalog cards. configId opens that product in the 3D studio.
  // Every card shows /assets/catalog/<id>.webp, our own 3D render, with a "Diseño de referencia" label.
  // When you have a real photo: save it in assets/catalog/, set photo: "/assets/catalog/your-file.webp"
  // and isConcept: false. The label disappears and no code changes are needed.
  catalog: [
    { id: "llavero", name: "Llavero con nombre", price: 13000, tag: "Top diciembre", configId: "llavero", desc: "Dos colores, tu nombre o palabra.", photo: null, isConcept: true },
    { id: "logo", name: "Llavero con tu logo", price: 18000, configId: "logo", desc: "Tu marca o dibujo en relieve multicolor.", photo: null, isConcept: true },
    { id: "litofania", name: "Litofanía con foto + luz LED", price: 80000, tag: "Regalo top", configId: "litofania", desc: "Tu foto aparece al encender la luz.", photo: null, isConcept: true },
    { id: "placa", name: "Placa en relieve con tu foto", price: 45000, tag: "Nuevo", configId: "placa", desc: "Tu foto esculpida en un solo color.", photo: null, isConcept: true },
    { id: "bola", name: "Bola navideña con nombre", price: 15000, tag: "Navidad", configId: "bola", desc: "Para el árbol de toda la familia.", photo: null, isConcept: true },
    { id: "adorno-navidad", name: "Adorno \"Primera Navidad\"", price: 15000, tag: "Navidad", desc: "Estrella con nombre y año, para guardar.", photo: null, isConcept: true },
    { id: "topper", name: "Cake topper personalizado", price: 20000, configId: "topper", desc: "El toque final de la torta.", photo: null, isConcept: true },
    { id: "letrero", name: "Letrero de escritorio", price: 35000, configId: "letrero", desc: "Nombre y cargo, ideal para regalos de oficina.", photo: null, isConcept: true },
    { id: "cubo-litofanias", name: "Cubo de 4 litofanías con luz", price: 120000, tag: "Regalo top", desc: "Cuatro fotos que se encienden en una lámpara.", photo: null, isConcept: true },
    { id: "joyero-corazon", name: "Joyero corazón", price: 45000, tag: "Amor y Amistad", desc: "Con tapa, para anillos, aretes y cadenas.", photo: null, isConcept: true },
    { id: "trofeo", name: "Trofeo personalizado", price: 38000, desc: "Mejor mamá, mejor jefe, amigo secreto.", photo: null, isConcept: true },
    { id: "florero", name: "Florero en espiral", price: 35000, tag: "Día de la Madre", desc: "Para flores secas, en el color que elijas.", photo: null, isConcept: true },
    { id: "maceta", name: "Maceta mini con nombre", price: 30000, desc: "Para suculentas y cactus.", photo: null, isConcept: true },
    { id: "nombre-bebe", name: "Nombre para el cuarto", price: 45000, desc: "Letrero de pared para el cuarto del bebé.", photo: null, isConcept: true },
    { id: "placa-mascota", name: "Placa para mascota", price: 12000, desc: "Nombre al frente, teléfono atrás.", photo: null, isConcept: true },
    { id: "serpiente", name: "Serpiente articulada", price: 18000, desc: "Se mueve de verdad. Pack x10 mini para sorpresas a $60.000.", photo: null, isConcept: true },
    { id: "imanes", name: "Imanes de nevera x4", price: 20000, desc: "Con iniciales o una palabra.", photo: null, isConcept: true },
    { id: "marcapaginas", name: "Marcapáginas con nombre", price: 8000, desc: "El detalle para quien lee.", photo: null, isConcept: true },
    { id: "soporte-celular", name: "Soporte de celular con nombre", price: 32000, desc: "Para escritorio o mesa de noche.", photo: null, isConcept: true },
    { id: "placa-qr", name: "Placa con QR + dedicatoria", price: 35000, desc: "Su canción, video o mensaje en un QR.", photo: null, isConcept: true },
    { id: "arbol-navidad", name: "Árbol de Navidad de escritorio", price: 35000, tag: "Navidad", desc: "Minimalista, para la oficina o el cuarto.", photo: null, isConcept: true },
    { id: "pesebre", name: "Pesebre minimalista", price: 65000, tag: "Navidad", desc: "La tradición, en versión moderna.", photo: null, isConcept: true },
    { id: "soporte-control", name: "Soporte para control", price: 40000, desc: "Para el gamer de la casa.", photo: null, isConcept: true },
    { id: "soporte-audifonos", name: "Soporte para audífonos", price: 65000, desc: "Con nombre, en tus colores.", photo: null, isConcept: true },
    { id: "posavasos", name: "Posavasos x4 con inicial o logo", price: 45000, desc: "Para casa o para tu marca.", photo: null, isConcept: true },
    { id: "organizador", name: "Organizador de escritorio", price: 55000, desc: "Lápices, cables y orden, con tu nombre.", photo: null, isConcept: true },
    { id: "porta-tarjetas", name: "Porta-tarjetas con logo", price: 28000, tag: "Empresas", desc: "Desde 10 unidades a $22.000 c/u.", photo: null, isConcept: true },
    { id: "kit-escritorio", name: "Kit de escritorio con logo", price: 95000, tag: "Empresas", desc: "Portalápices, soporte de celular y posavasos.", photo: null, isConcept: true }
  ]
};
