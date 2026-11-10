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

export function campusSignatureFor(college?: string | null): CampusSignature | null {
  const raw = (college || '').trim();
  if (!raw) return null;

  const known = KNOWN.find((k) => k.match.test(raw));
  if (known) {
    const { match: _match, ...sig } = known;
    return sig;
  }

  // Unknown college: write the name as the student typed it, minus a long "(XYZ)" suffix.
  // Very long official names don't fit one handwritten line, so prefer the bracketed short form.
  const bracket = raw.match(/\(([^)]{2,24})\)/)?.[1]?.trim();
  const plain = raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const name = plain.length <= 30 ? plain : bracket || plain.slice(0, 30).replace(/\s+\S*$/, '');
  return { slug: slugify(raw) || 'campus', name };
}
