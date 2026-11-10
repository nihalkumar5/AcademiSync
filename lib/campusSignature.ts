// The "campus signature" at the end of Home: a line drawing of the campus and the college
// name in handwriting. Colleges we know get a proper name, their city and (when we have it)
// their own illustration; everyone else gets the shared campus drawing and their college name.

export interface CampusSignature {
  /** Stable key, used for the once-per-session animation and art file names */
  slug: string;
  /** Written in handwriting, so keep it short and in natural case */
  name: string;
  /** Small caption under the name */
  place?: string;
  /** Optional per-college line art in /public (an SVG drawn with strokes, no fills) */
  art?: string;
}

type Known = CampusSignature & { match: RegExp };

// Add a college here to give it a proper signature. Drop `/public/campus/<slug>.svg` and set
// `art` to switch it from the shared drawing to its own.
const KNOWN: Known[] = [
  {
    match: /naya raipur|atal nagar|shyama prasad|iiit\s*-?\s*nr\b|iiitnr|dspm/i,
    slug: 'iiit-nr',
    name: 'IIIT Naya Raipur',
    place: 'Naya Raipur, Chhattisgarh',
  },
  {
    match: /\bnit\b.*raipur|national institute of technology.*raipur|\bnitrr\b/i,
    slug: 'nit-raipur',
    name: 'NIT Raipur',
    place: 'Raipur, Chhattisgarh',
  },
  {
    match: /ravishankar|\bprsu\b/i,
    slug: 'prsu',
    name: 'Pt. RSU Raipur',
    place: 'Raipur, Chhattisgarh',
  },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

// SheerID (the college search) writes the place into the name: "XYZ University (Durg, Chhattisgarh)"
// or "(Naya Raipur, CT)". Expand the two-letter state codes it uses.
const STATE_CODES: Record<string, string> = {
  AN: 'Andaman and Nicobar', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar',
  CH: 'Chandigarh', CG: 'Chhattisgarh', CT: 'Chhattisgarh', DL: 'Delhi', DN: 'Dadra and Nagar Haveli', GA: 'Goa',
  GJ: 'Gujarat', HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand', JK: 'Jammu and Kashmir', KA: 'Karnataka',
  KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MH: 'Maharashtra', ML: 'Meghalaya', MN: 'Manipur',
  MP: 'Madhya Pradesh', MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', OR: 'Odisha', PB: 'Punjab', PY: 'Puducherry',
  RJ: 'Rajasthan', SK: 'Sikkim', TG: 'Telangana', TS: 'Telangana', TN: 'Tamil Nadu', TR: 'Tripura',
  UK: 'Uttarakhand', UT: 'Uttarakhand', UP: 'Uttar Pradesh', WB: 'West Bengal',
};
const STATE_NAMES = new Set(Object.values(STATE_CODES).map((n) => n.toLowerCase()));

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_m, a, b) => a + b.toUpperCase());

/** "(Durg, Chhattisgarh)" / "(Naya Raipur, CT)" / "(Bhilai)" → a readable place, or null if it isn't one. */
export function placeFromBracket(bracket?: string | null): string | null {
  const b = (bracket || '').trim();
  if (!b || b.length > 48) return null;
  const parts = b.split(',').map((x) => x.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || '';
  const code = STATE_CODES[last.toUpperCase()];
  const isState = !!code || STATE_NAMES.has(last.toLowerCase());
  if (parts.length >= 2 && isState) {
    const city = titleCase(parts.slice(0, -1).join(', '));
    return `${city}, ${code || titleCase(last)}`;
  }
  if (parts.length === 1 && isState) return code || titleCase(last);
  return null;
}

const lastBracket = (s: string) => s.match(/\(([^()]*)\)\s*$/)?.[1]?.trim() || null;

export function campusSignatureFor(college?: string | null): CampusSignature | null {
  const raw = (college || '').trim();
  if (!raw) return null;

  const known = KNOWN.find((k) => k.match.test(raw));
  if (known) {
    const { match: _match, ...sig } = known;
    return sig;
  }

  // Unknown college: write the name as the student typed it. A trailing "(City, State)" becomes the
  // place; a short "(XYZ)" is the fallback name when the full name is too long for three lines.
  const trailing = lastBracket(raw);
  const place = placeFromBracket(trailing) || undefined;
  const bracket = raw.match(/\(([^)]{2,24})\)/)?.[1]?.trim();
  const shortForm = bracket && !placeFromBracket(bracket) ? bracket : undefined;
  const plain = raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const name = plain.length <= 56 ? plain : shortForm || plain.slice(0, 56).replace(/\s+\S*$/, '');
  return { slug: slugify(raw) || 'campus', name, ...(place ? { place } : {}) };
}

// ---------- Place lookup for colleges whose name doesn't carry it ----------
const PLACE_CACHE = (slug: string) => `campus_place_v1_${slug}`;

/** Find "City, State" for a college: popular list (state), then SheerID once, cached on the device. */
export async function lookupCampusPlace(college: string, slug: string): Promise<string | null> {
  try {
    const hit = localStorage.getItem(PLACE_CACHE(slug));
    if (hit !== null) return hit || null;
  } catch {}

  const save = (v: string | null) => {
    try {
      localStorage.setItem(PLACE_CACHE(slug), v || '');
    } catch {}
    return v;
  };

  const plain = college.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const q = plain.toLowerCase();
  const { POPULAR_INDIAN_COLLEGES } = await import('./collegeDirectory');
  const popular = POPULAR_INDIAN_COLLEGES.find(
    (c) => c.name.toLowerCase() === q || c.shortName.toLowerCase() === q || c.aliases.some((a) => a === q)
  );

  let reached = false;
  try {
    const res = await fetch(
      `https://orgsearch.sheerid.net/rest/organization/search?country=IN&type=UNIVERSITY&name=${encodeURIComponent(plain)}`
    );
    reached = res.ok;
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const norm = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
        const match = list.find((x: any) => norm(String(x?.name || '')) === q) || list[0];
        const place = placeFromBracket(lastBracket(String(match?.name || '')));
        if (place) return save(place);
      }
    }
  } catch {
    // offline or blocked: fall through to the state we know
  }
  // Only remember "no place" when SheerID actually answered; offline tries again next time
  return reached ? save(popular?.state || null) : popular?.state || null;
}
