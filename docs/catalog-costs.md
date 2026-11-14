# Catalog: production estimates, sources and licenses

Internal working sheet for the catalog in `js/config.js`. It is kept out of the deployed site
(`.vercelignore`) because `config.js` is public and should not carry costs or margins.

**Every figure here is an estimate made before slicing.** Weights and times come from the size of each
concept model, not from Bambu Studio. Replace them with the sliced values as each design is modelled,
and re-check the price.

## Costing method

```
material  = grams x filament cost per gram x 1.10        (10 % for purge, supports and failed starts)
machine   = print hours x machine rate
cost      = material + machine + hardware
```

| Input | Value used | Where it comes from |
| --- | --- | --- |
| Filament | COP 40 per gram | 14 kg of PLA+ for US$133.98 is about US$9.57/kg, roughly COP 30.600/kg at a rate near 3.200. Rounded up to COP 40,000/kg to leave room for shipping and import charges. Update once the order arrives. |
| Machine rate | COP 650 per hour | Printer cost spread over about 3.000 printing hours, plus electricity. A working assumption. |
| Hardware | per item | Key rings, magnets and LED bases are guesses until a supplier is chosen. |

Multicolor prints purge filament on every color change, so pieces with many swaps will weigh more than
listed. Labor (design, post-processing, packing, chat) is not included: the margin column has to pay for it.

## Estimates

| Item | Weight | Print time | Material | Machine | Hardware | Est. cost | Price | Gross margin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Llavero con nombre | 8 g | 35 min | $400 | $400 | $300 (key ring) | $1.000 | $13.000 | 92% |
| Llavero con tu logo | 10 g | 50 min | $400 | $500 | $300 (key ring) | $1.300 | $18.000 | 93% |
| Litofanía con foto + luz LED | 95 g | 6 h 00 | $4.200 | $3.900 | $9.000 (LED base) | $17.100 | $80.000 | 79% |
| Placa en relieve con tu foto | 85 g | 4 h 30 | $3.700 | $2.900 | — | $6.700 | $45.000 | 85% |
| Bola navideña con nombre | 14 g | 55 min | $600 | $600 | $300 (cap and loop) | $1.500 | $15.000 | 90% |
| Adorno "Primera Navidad" | 12 g | 45 min | $500 | $500 | $300 (ring) | $1.300 | $15.000 | 91% |
| Cake topper personalizado | 14 g | 50 min | $600 | $500 | — | $1.200 | $20.000 | 94% |
| Letrero de escritorio | 55 g | 2 h 45 | $2.400 | $1.800 | — | $4.200 | $35.000 | 88% |
| Cubo de 4 litofanías con luz | 130 g | 9 h 00 | $5.700 | $5.800 | $9.000 (LED module) | $20.600 | $120.000 | 83% |
| Joyero corazón | 90 g | 4 h 00 | $4.000 | $2.600 | — | $6.600 | $45.000 | 85% |
| Trofeo personalizado | 70 g | 3 h 30 | $3.100 | $2.300 | — | $5.400 | $38.000 | 86% |
| Florero en espiral | 60 g | 2 h 00 | $2.600 | $1.300 | — | $3.900 | $35.000 | 89% |
| Maceta mini con nombre | 70 g | 3 h 00 | $3.100 | $2.000 | — | $5.000 | $30.000 | 83% |
| Nombre para el cuarto | 80 g | 3 h 30 | $3.500 | $2.300 | $500 (mounting tape) | $6.300 | $45.000 | 86% |
| Placa para mascota | 6 g | 25 min | $300 | $300 | $300 (ring) | $800 | $12.000 | 93% |
| Serpiente articulada | 35 g | 2 h 00 | $1.500 | $1.300 | — | $2.800 | $18.000 | 84% |
| Imanes de nevera x4 | 24 g | 1 h 15 | $1.100 | $800 | $1.600 (4 magnets) | $3.500 | $20.000 | 83% |
| Marcapáginas con nombre | 5 g | 20 min | $200 | $200 | — | $400 | $8.000 | 95% |
| Soporte de celular con nombre | 60 g | 3 h 00 | $2.600 | $2.000 | — | $4.600 | $32.000 | 86% |
| Placa con QR + dedicatoria | 45 g | 2 h 30 | $2.000 | $1.600 | — | $3.600 | $35.000 | 90% |
| Árbol de Navidad de escritorio | 85 g | 4 h 00 | $3.700 | $2.600 | — | $6.300 | $35.000 | 82% |
| Pesebre minimalista | 120 g | 6 h 00 | $5.300 | $3.900 | — | $9.200 | $65.000 | 86% |
| Soporte para control | 95 g | 4 h 30 | $4.200 | $2.900 | — | $7.100 | $40.000 | 82% |
| Soporte para audífonos | 160 g | 8 h 00 | $7.000 | $5.200 | — | $12.200 | $65.000 | 81% |
| Posavasos x4 con inicial o logo | 110 g | 5 h 00 | $4.800 | $3.200 | $800 (cork or felt pads) | $8.900 | $45.000 | 80% |
| Organizador de escritorio | 150 g | 7 h 00 | $6.600 | $4.600 | — | $11.200 | $55.000 | 80% |
| Porta-tarjetas con logo | 45 g | 2 h 00 | $2.000 | $1.300 | — | $3.300 | $28.000 | 88% |
| Kit de escritorio con logo | 220 g | 10 h 00 | $9.700 | $6.500 | $400 (pads) | $16.600 | $95.000 | 83% |

## Printability

All items are designed for a Bambu Lab P1S with AMS: PLA only, at most four colors per piece, and every
part fits inside 256 x 256 x 256 mm. Hardware is limited to key rings, magnets, pads and LED bases.
The headphone stand is the tallest piece (about 190 mm).

## Sources and licenses

| Items | Source | License |
| --- | --- | --- |
| All 28 catalog items | Original Tinker designs | Own work. No third-party model, photo or texture is used. |
| Catalog and hero images | Rendered with the studio's own renderer (`npm run render`) | Own work |
| Sample photo and sample logo in the renders | Drawn in code in `tools/render-entry.js` | Own work |
| Fonts | Inter, Space Mono | SIL Open Font License (see `assets/fonts/`) |

The renders are **concepts**: they show the idea and the proportions, and each card carries a
"Diseño de referencia" label. The printable model for each non-configurable item still has to be drawn.
If a design is ever based on someone else's model, record it here first: author, link, license, and a
screenshot of the license on the day it was downloaded. Most free models on MakerWorld and Printables use
licenses that do not allow selling prints. No characters, logos or brands owned by others.
