export const INDIAN_COLLEGES = [
  "Indian Institute of Technology (IIT) Bombay",
  "Indian Institute of Technology (IIT) Delhi",
  "Indian Institute of Technology (IIT) Kanpur",
  "Indian Institute of Technology (IIT) Kharagpur",
  "Indian Institute of Technology (IIT) Madras",
  "Indian Institute of Technology (IIT) Roorkee",
  "Indian Institute of Technology (IIT) Guwahati",
  "Indian Institute of Technology (IIT) Hyderabad",
  "National Institute of Technology (NIT) Trichy",
  "National Institute of Technology (NIT) Surathkal",
  "National Institute of Technology (NIT) Warangal",
  "National Institute of Technology (NIT) Calicut",
  "National Institute of Technology (NIT) Rourkela",
  "Motilal Nehru National Institute of Technology (MNNIT) Allahabad",
  "Malaviya National Institute of Technology (MNIT) Jaipur",
  "Visvesvaraya National Institute of Technology (VNIT) Nagpur",
  "Indian Institute of Information Technology (IIIT) Hyderabad",
  "Indian Institute of Information Technology (IIIT) Bangalore",
  "Indian Institute of Information Technology (IIIT) Allahabad",
  "Indian Institute of Information Technology (IIIT) Delhi",
  "Birla Institute of Technology and Science (BITS) Pilani",
  "Vellore Institute of Technology (VIT)",
  "SRM Institute of Science and Technology",
  "Manipal Institute of Technology (MIT)",
  "Kalinga Institute of Industrial Technology (KIIT)",
  "Delhi Technological University (DTU)",
  "Netaji Subhas University of Technology (NSUT)",
  "Jadavpur University",
  "Anna University",
  "University of Delhi (DU)",
  "University of Mumbai",
  "Savitribai Phule Pune University (SPPU)",
  "National Law School of India University (NLSIU)",
  "NALSAR University of Law",
  "National Law University (NLU) Delhi",
  "All India Institute of Medical Sciences (AIIMS) Delhi",
  "Christian Medical College (CMC) Vellore",
  "King George's Medical University (KGMU)",
  "JIPMER Puducherry",
  "Christ University",
  "NMIMS",
  "Symbiosis International University",
  "Thapar Institute of Engineering and Technology",
  "PSG College of Technology",
  "RV College of Engineering",
  "BMS College of Engineering",
  "MS Ramaiah Institute of Technology",
  "VJTI Mumbai",
  "College of Engineering Pune (COEP)",
  "LD College of Engineering",
  "Nirma University"
];

export const STANDARD_PROGRAMMES = [
  // Engineering & Tech
  'B.Tech',
  'B.E.',
  'M.Tech',
  'BCA',
  'MCA',
  // Medical & Allied Health
  'MBBS',
  'BDS',
  'B.Pharm',
  'M.Pharm',
  'M.D.',
  'M.S.',
  'BAMS',
  'BHMS',
  'BPT',
  'B.Sc Nursing',
  // Law & Legal Studies
  'B.A. LL.B',
  'B.B.A. LL.B',
  'LL.B',
  'LL.M',
  // Management & Commerce
  'BBA',
  'MBA',
  'B.Com',
  'M.Com',
  // Sciences & Arts
  'B.Sc',
  'M.Sc',
  'B.A.',
  'M.A.',
  'B.Des',
  'M.Des',
  'B.Arch',
  'Ph.D',
  'Other / Diploma'
];

export const STANDARD_BRANCHES = [
  // Engineering Branches
  'Computer Science & Engineering (CSE)',
  'Information Technology (IT)',
  'Data Science & Artificial Intelligence (DS & AI)',
  'Artificial Intelligence & Machine Learning (AI & ML)',
  'Electronics & Communication (ECE)',
  'Electrical & Electronics (EEE)',
  'Electrical Engineering (EE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Chemical Engineering (CHE)',
  'Aerospace Engineering (AE)',
  'Biotechnology (BT)',
  'Mathematics & Computing (MnC)',
  
  // Medical & Healthcare
  'General Medicine (MBBS)',
  'Dentistry (BDS)',
  'Pharmacy (B.Pharm / M.Pharm)',
  'Physiotherapy (BPT)',
  'Nursing',
  'Ayurveda (BAMS)',
  'Homeopathy (BHMS)',
  'Anatomy & Physiology',
  'Pathology & Microbiology',
  'General Surgery',
  'Pediatrics',

  // Law Specialisations
  'Corporate Law',
  'Criminal Law',
  'Constitutional Law',
  'Intellectual Property Law (IPR)',
  'International Law',
  'General Law',

  // Commerce & Management
  'Finance & Accounting',
  'Marketing & Operations',
  'Human Resources (HR)',
  'Business Analytics',
  'Banking & Insurance',
  'Economics',

  // Sciences & Others
  'Physics',
  'Chemistry',
  'Mathematics',
  'Psychology',
  'Architecture & Design',
  'Other / General'
];

/**
 * Normalizes a string by lowercasing and stripping all dots, dashes, slashes, spaces, and punctuation.
 * e.g. "M.Tech" -> "mtech", "B.Tech" -> "btech", "DS & AI" -> "dsai"
 */
export function normalizeSearchString(val: string): string {
  if (!val) return '';
  return val.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a candidate option matches a user query:
 * 1. Direct case-insensitive substring match: candidate.toLowerCase().includes(query.toLowerCase())
 * 2. Normalized alphanumeric match (stripping dots, spaces, symbols):
 *    e.g. candidate "M.Tech" (norm: "mtech") matches query "mtech" (norm: "mtech")
 *    e.g. candidate "B.Tech" matches query "btech"
 *    e.g. candidate "Data Science & Artificial Intelligence (DS & AI)" matches query "dsai"
 */
export function matchesSearchOption(candidate: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const cleanQuery = query.trim().toLowerCase();
  const cleanCand = (candidate || '').toLowerCase();
  
  if (cleanCand.includes(cleanQuery)) return true;

  const normQuery = normalizeSearchString(query);
  const normCand = normalizeSearchString(candidate);
  
  if (normQuery && normCand.includes(normQuery)) return true;

  return false;
}

/**
 * Returns filtered standard programmes with dot-insensitive & symbol-insensitive search.
 */
export function filterProgrammes(query: string): string[] {
  if (!query || !query.trim()) return STANDARD_PROGRAMMES;
  return STANDARD_PROGRAMMES.filter((p) => matchesSearchOption(p, query));
}

/**
 * Returns filtered standard branches with symbol-insensitive & acronym-aware search.
 */
export function filterBranches(query: string): string[] {
  if (!query || !query.trim()) return STANDARD_BRANCHES;
  return STANDARD_BRANCHES.filter((b) => matchesSearchOption(b, query));
}

/**
 * Auto-canonicalizes typed degree strings to official standard spelling:
 * e.g. "mtech" -> "M.Tech", "btech" -> "B.Tech", "phd" -> "Ph.D"
 */
export function getCanonicalProgramme(input: string): string {
  if (!input || !input.trim()) return input;
  const norm = normalizeSearchString(input);
  const matched = STANDARD_PROGRAMMES.find((p) => normalizeSearchString(p) === norm);
  return matched || input.trim();
}

