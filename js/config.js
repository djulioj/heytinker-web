// Business settings and catalog data. Edit this file to change prices, products or contact info.
window.TINKER = {
  // WhatsApp Business number in international format, digits only (57 + 10-digit mobile).
  whatsapp: "57XXXXXXXXXX",
  instagram: "heytinker.co",
  orderCutoff: "15 de diciembre",

  // Filament colors offered in the configurator.
  colors: [
    { id: "negro", name: "Negro", hex: "#141416" },
    { id: "blanco", name: "Blanco", hex: "#F2F2EE" },
    { id: "naranja", name: "Naranja", hex: "#FF6A1A" },
    { id: "rojo", name: "Rojo", hex: "#C8102E" },
    { id: "verde", name: "Verde", hex: "#1F7A3F" },
    { id: "dorado", name: "Dorado", hex: "#C9A227" },
    { id: "azul", name: "Azul", hex: "#1E4FD8" },
    { id: "rosado", name: "Rosado", hex: "#F29BB8" },
    { id: "gris", name: "Gris", hex: "#8A8A90" }
  ],

  // Products the configurator can preview. tiers: unit price by minimum quantity.
  configurable: [
    {
      id: "llavero",
      name: "Llavero con nombre",
      maxChars: 10,
      placeholder: "Sofía",
      tiers: [
        { min: 1, unit: 13000 },
        { min: 5, unit: 11000 },
        { min: 10, unit: 10000 }
      ],
      note: "Pack x5 a $55.000 · x10 a $100.000. Ideal para amigo secreto."
    },
    {
      id: "bola",
      name: "Bola navideña con nombre",
      maxChars: 9,
      placeholder: "Mateo",
      tiers: [
        { min: 1, unit: 15000 },
        { min: 4, unit: 12500 }
      ],
      note: "Set familiar x4 a $50.000."
    },
    {
      id: "letrero",
      name: "Letrero de escritorio",
      maxChars: 16,
      placeholder: "Ana Torres",
      subline: { placeholder: "Gerente de Diseño", maxChars: 24 },
      tiers: [
        { min: 1, unit: 35000 },
        { min: 5, unit: 30000 }
      ],
      note: "Nombre y cargo. Precio especial para equipos desde 5 unidades."
    },
    {
      id: "topper",
      name: "Cake topper",
      maxChars: 14,
      placeholder: "Feliz 30",
      tiers: [{ min: 1, unit: 20000 }],
      note: "Para cumpleaños, cenas y celebraciones."
    }
  ],

  // Full catalog shown as cards. configId links a card to the configurator.
  catalog: [
    { name: "Llavero con nombre", price: 13000, tag: "Top diciembre", configId: "llavero", desc: "Dos colores, tu nombre o palabra." },
    { name: "Bola navideña con nombre", price: 15000, tag: "Navidad", configId: "bola", desc: "Para el árbol de toda la familia." },
    { name: "Cake topper personalizado", price: 20000, configId: "topper", desc: "El toque final de la torta." },
    { name: "Soporte de celular con nombre", price: 32000, desc: "Para escritorio o mesa de noche." },
    { name: "Placa con QR + dedicatoria", price: 35000, desc: "Su canción, video o mensaje en un QR." },
    { name: "Letrero de escritorio", price: 35000, configId: "letrero", desc: "Nombre y cargo, ideal para regalos de oficina." },
    { name: "Árbol de Navidad de escritorio", price: 35000, tag: "Navidad", desc: "Minimalista, para la oficina o el cuarto." },
    { name: "Soporte para control", price: 40000, desc: "Para el gamer de la casa." },
    { name: "Posavasos x4 con inicial o logo", price: 45000, desc: "Para casa o para tu marca." },
    { name: "Organizador de escritorio", price: 55000, desc: "Lápices, cables y orden, con tu nombre." },
    { name: "Soporte para audífonos", price: 65000, desc: "Con nombre, en tus colores." },
    { name: "Pesebre minimalista", price: 65000, tag: "Navidad", desc: "La tradición, en versión moderna." },
    { name: "Litofanía con foto + luz LED", price: 80000, tag: "Regalo top", desc: "Tu foto aparece al encender la luz." }
  ]
};
