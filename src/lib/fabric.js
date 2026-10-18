// Generates a textile-looking swatch (SVG data URI) used when a product has no uploaded photo yet.

const GOLD = "#E8C77A";

const MOTIFS = {
  Saree: (id) => `<pattern id="${id}" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M19 3L35 19L19 35L3 19Z" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="1.4"/><circle cx="19" cy="19" r="3.2" fill="${GOLD}"/></pattern>`,
  Lehenga: (id) => `<pattern id="${id}" width="44" height="44" patternUnits="userSpaceOnUse"><g fill="#fff" fill-opacity=".55"><circle cx="22" cy="12" r="6"/><circle cx="32" cy="22" r="6"/><circle cx="22" cy="32" r="6"/><circle cx="12" cy="22" r="6"/></g><circle cx="22" cy="22" r="4.5" fill="${GOLD}"/></pattern>`,
  Kurti: (id) => `<pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="4" height="20" fill="#fff" fill-opacity=".45"/><rect x="10" width="1.5" height="20" fill="${GOLD}" fill-opacity=".9"/></pattern>`,
  Dupatta: (id) => `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.6" fill="#fff" fill-opacity=".7"/><circle cx="19" cy="19" r="2.6" fill="${GOLD}"/></pattern>`,
  Blouse: (id) => `<pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M0 15Q7.5 0 15 15T30 15" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/><circle cx="15" cy="24" r="2" fill="${GOLD}"/></pattern>`,
  "Fabric Roll": (id) => `<pattern id="${id}" width="300" height="26" patternUnits="userSpaceOnUse"><rect width="300" height="13" fill="#fff" fill-opacity=".14"/><rect y="13" width="300" height="1.4" fill="#000" fill-opacity=".22"/></pattern>`,
};

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function swatchDataUri({ tone, category, seed }) {
  const [c1, c2] = tone;
  const uid = "p" + hash(seed).toString(36);
  const motif = (MOTIFS[category] ?? MOTIFS.Saree)(uid);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>${motif}</defs>
<rect width="300" height="300" fill="url(#g${uid})"/>
<rect width="300" height="300" fill="url(#${uid})"/>
<rect x="14" y="14" width="272" height="272" fill="none" stroke="${GOLD}" stroke-width="3"/>
<rect x="22" y="22" width="256" height="256" fill="none" stroke="${GOLD}" stroke-opacity=".6" stroke-width="1"/>
<rect x="14" y="248" width="272" height="16" fill="${GOLD}" fill-opacity=".85"/>
<path d="${Array.from({ length: 17 }, (_, i) => `M${14 + i * 16} 248l8 -10l8 10z`).join("")}" fill="${GOLD}" fill-opacity=".85"/>
</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
