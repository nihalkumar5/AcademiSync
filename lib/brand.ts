// Which brand this build shows. One codebase, two faces:
// - default: Intersemester (app.intersemester.com, the Android app)
// - iiitnr:  IIITNR Academics on the college server (academics.iiitnr.edu.in), "Powered by Intersemester"
// Set NEXT_PUBLIC_BRAND=iiitnr at build time to switch. It is baked into the bundle, so rebuild after changing it.

export type Brand = {
  id: 'intersemester' | 'iiitnr';
  /** Full product name, used in titles and headings */
  name: string;
  /** Short name for tight spots (home-screen label, header on small phones) */
  shortName: string;
  /** Second line under the name in the sidebar and splash */
  tagline: string;
  /** Square logo in /public, or null to use the Intersemester wordmark */
  logo: string | null;
  /** Show "Powered by Intersemester" (college builds) */
  poweredBy: boolean;
  /** Browser / status-bar colour of the splash */
  themeColor: string;
};

const BRANDS: Record<Brand['id'], Brand> = {
  intersemester: {
    id: 'intersemester',
    name: 'Intersemester',
    shortName: 'Intersemester',
    tagline: 'Your academic life, organized',
    logo: null,
    poweredBy: false,
    themeColor: '#FAFAF9',
  },
  iiitnr: {
    id: 'iiitnr',
    name: 'IIITNR Academics',
    shortName: 'IIITNR',
    tagline: 'IIIT Naya Raipur',
    logo: '/brand/iiitnr-logo.png',
    poweredBy: true,
    themeColor: '#FAFAF9',
  },
};

export const BRAND: Brand = process.env.NEXT_PUBLIC_BRAND === 'iiitnr' ? BRANDS.iiitnr : BRANDS.intersemester;
export const IS_COLLEGE_BRAND = BRAND.id !== 'intersemester';
