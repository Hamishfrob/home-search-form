// Turns what she told the form into the answers.json the Python side reads
// (docs/answers-schema.md), and into the emailed PSv1 block (src/property_search/friend.py).
//
// Everything here is plain functions on plain data, so it runs in the browser
// and under `node --test` unchanged.

export const IMPORTANCE_POINTS = [1, 2, 4, 7];   // not important, some, important, essential
export const PRESENTATION_POINTS = 3;             // fixed: photos and a floorplan
export const MAX_GROUPS = 6;

export const CATEGORY_LABELS = {
  station: "a station",
  primary_school: "a primary school",
  secondary_school: "a secondary school",
  leisure_centre: "a leisure centre",
  park: "a park",
  supermarket: "a supermarket",
  gp: "a GP surgery",
};

export const TYPE_WORDS = {
  flat: ["flat", "apartment", "studio"],
  maisonette: ["maisonette"],
  terraced: ["terraced", "terrace", "end of terrace", "town house", "mews"],
  semi: ["semi-detached"],
  detached: ["detached"],
  bungalow: ["bungalow"],
};

export const REQUIRED_WEIGHTS = ["outdoor_space", "space_per_sqm", "tenure_and_lease",
  "price_vs_comparables", "bedrooms", "presentation"];

/** Whole-number weights that always add up to exactly 100 (largest remainder). */
export function toHundred(points) {
  const keys = Object.keys(points);
  const total = keys.reduce((sum, k) => sum + points[k], 0);
  if (total <= 0) throw new Error("no weights to share out");
  const exact = Object.fromEntries(keys.map(k => [k, points[k] * 100 / total]));
  const out = Object.fromEntries(keys.map(k => [k, Math.floor(exact[k])]));
  let left = 100 - keys.reduce((sum, k) => sum + out[k], 0);
  const order = [...keys].sort((a, b) =>
    (exact[b] - out[b]) - (exact[a] - out[a]) || (a < b ? -1 : 1));
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) out[order[i]] += 1;
  return out;
}

const titleCase = s => s.replace(/(^|[\s-])([a-z])/g, (m, pre, c) => pre + c.toUpperCase());

/** "hither green" becomes {name: "Hither Green", slug: "Hither-Green"}. The
 *  slug is a guess, and `setup --check` proves it against the portal. */
export function areaFrom(text) {
  const name = titleCase(text.trim().replace(/\s+/g, " ").toLowerCase());
  const slug = name.replace(/['’.,]/g, "").replace(/\s+/g, "-");
  return { name, slug };
}

export function profileName(name) {
  const slug = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 30);
  return slug || "friend";
}

/** Shares for the nearby groups: proportional to importance, exactly 1 in total. */
export function sharesFor(levels) {
  const pts = levels.map(l => IMPORTANCE_POINTS[l] ?? 2);
  const total = pts.reduce((a, b) => a + b, 0);
  const shares = pts.map(p => Math.round(p / total * 1000) / 1000);
  const drift = Math.round((1 - shares.reduce((a, b) => a + b, 0)) * 1000) / 1000;
  shares[shares.length - 1] = Math.round((shares[shares.length - 1] + drift) * 1000) / 1000;
  return shares;
}

/** Walk times: "within N minutes" is full marks, three times that is none. */
export function walkMinutes(walk) {
  return { good_minutes: walk, far_minutes: walk * 3 };
}

export function toAnswers(state) {
  const gardenLevel = { must: 3, nice: 2, dont: 0 }[state.garden] ?? 2;
  const imp = state.importance || {};
  const places = (state.places || [])
    .filter(p => p.category !== "other" || (p.name || "").trim())
    .slice(0, MAX_GROUPS);
  if (!places.length) throw new Error("choose at least one kind of place");

  const points = {
    outdoor_space: IMPORTANCE_POINTS[gardenLevel],
    space_per_sqm: IMPORTANCE_POINTS[imp.space_per_sqm ?? 2],
    tenure_and_lease: IMPORTANCE_POINTS[imp.tenure_and_lease ?? 2],
    price_vs_comparables: IMPORTANCE_POINTS[imp.price_vs_comparables ?? 2],
    bedrooms: IMPORTANCE_POINTS[imp.bedrooms ?? 2],
    nearby: IMPORTANCE_POINTS[imp.nearby ?? 2],
    presentation: PRESENTATION_POINTS,
  };
  if ((imp.quiet_street ?? 2) > 0) points.quiet_street = IMPORTANCE_POINTS[imp.quiet_street ?? 2];

  const shares = sharesFor(places.map(p => p.importance ?? 2));
  let others = 0;
  const nearby = places.map((p, i) => {
    if (p.category === "other") {
      others += 1;
      const name = p.name.trim();
      return {
        key: `other_${others}`,
        name,
        share: shares[i],
        ...walkMinutes(p.walk ?? 10),
        places: [{ key: `other_${others}_place`, query: name, name, verify: true }],
      };
    }
    const group = {
      key: p.category,
      name: CATEGORY_LABELS[p.category],
      share: shares[i],
      category: p.category,
      ...walkMinutes(p.walk ?? 10),
    };
    const named = (p.name || "").trim();
    if (named) group.places = [{ key: `${p.category}_named`, query: named, name: named,
                                 category: p.category }];
    return group;
  });

  const types = [...new Set((state.types || []).flatMap(t => TYPE_WORDS[t] || []))];
  const answers = {
    profile_name: profileName(state.name),
    email: (state.email || "").trim(),
    email_alerts: state.emailMode || "none",
    areas: (state.areas || []).map(areaFrom),
    radius_miles: state.radius ?? 0.5,
    max_price: Math.round(state.maxPrice),
    stretch_percent: state.stretch ?? 10,
    min_bedrooms: state.minBeds ?? 1,
    preferred_bedrooms: Math.max(state.prefBeds ?? 2, state.minBeds ?? 1),
    outdoor_space_required: state.garden === "must",
    accepted_types: types,
    nearby,
    weights: toHundred(points),
  };
  return answers;
}

// --- the PSv1 block ----------------------------------------------------------

let table;
function crcTable() {
  if (table) return table;
  table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

export function crc32(bytes) {
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for (const b of bytes) c = t[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function base64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeSubmission(answers) {
  const bytes = new TextEncoder().encode(JSON.stringify(answers));
  return `PSv1:${base64url(bytes)}:${crc32(bytes).toString(16).padStart(8, "0")}`;
}
