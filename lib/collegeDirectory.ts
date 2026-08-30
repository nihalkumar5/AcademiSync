export interface CollegeItem {
  id: string;
  name: string;
  shortName: string;
  state: string;
  aliases: string[];
}

export const POPULAR_INDIAN_COLLEGES: CollegeItem[] = [
  { id: 'iit-bombay', name: 'Indian Institute of Technology Bombay', shortName: 'IIT Bombay', state: 'Maharashtra', aliases: ['iitb', 'iit bombay', 'iit powai'] },
  { id: 'iit-delhi', name: 'Indian Institute of Technology Delhi', shortName: 'IIT Delhi', state: 'Delhi', aliases: ['iitd', 'iit delhi', 'iit hauz khas'] },
  { id: 'iit-madras', name: 'Indian Institute of Technology Madras', shortName: 'IIT Madras', state: 'Tamil Nadu', aliases: ['iitm', 'iit madras', 'iit chennai'] },
  { id: 'iit-kharagpur', name: 'Indian Institute of Technology Kharagpur', shortName: 'IIT Kharagpur', state: 'West Bengal', aliases: ['iitkgp', 'iit kharagpur'] },
  { id: 'iit-kanpur', name: 'Indian Institute of Technology Kanpur', shortName: 'IIT Kanpur', state: 'Uttar Pradesh', aliases: ['iitk', 'iit kanpur'] },
  { id: 'iit-roorkee', name: 'Indian Institute of Technology Roorkee', shortName: 'IIT Roorkee', state: 'Uttarakhand', aliases: ['iitr', 'iit roorkee'] },
  { id: 'iit-guwahati', name: 'Indian Institute of Technology Guwahati', shortName: 'IIT Guwahati', state: 'Assam', aliases: ['iitg', 'iit guwahati'] },
  { id: 'iit-hyderabad', name: 'Indian Institute of Technology Hyderabad', shortName: 'IIT Hyderabad', state: 'Telangana', aliases: ['iith', 'iit hyderabad'] },
  { id: 'iit-bhu', name: 'IIT (BHU) Varanasi', shortName: 'IIT BHU', state: 'Uttar Pradesh', aliases: ['iit bhu', 'bhu it', 'iit varanasi'] },
  { id: 'bits-pilani', name: 'BITS Pilani (Pilani Campus)', shortName: 'BITS Pilani', state: 'Rajasthan', aliases: ['bits', 'bits pilani'] },
  { id: 'bits-goa', name: 'BITS Pilani (Goa Campus)', shortName: 'BITS Goa', state: 'Goa', aliases: ['bits goa', 'bpgc'] },
  { id: 'bits-hyderabad', name: 'BITS Pilani (Hyderabad Campus)', shortName: 'BITS Hyderabad', state: 'Telangana', aliases: ['bits hyd', 'bphc'] },
  { id: 'nit-trichy', name: 'National Institute of Technology Tiruchirappalli', shortName: 'NIT Trichy', state: 'Tamil Nadu', aliases: ['nitt', 'nit trichy'] },
  { id: 'nit-surathkal', name: 'National Institute of Technology Karnataka (Surathkal)', shortName: 'NIT Surathkal', state: 'Karnataka', aliases: ['nitk', 'nit surathkal'] },
  { id: 'nit-rourkela', name: 'National Institute of Technology Rourkela', shortName: 'NIT Rourkela', state: 'Odisha', aliases: ['nitr', 'nit rourkela'] },
  { id: 'nit-warangal', name: 'National Institute of Technology Warangal', shortName: 'NIT Warangal', state: 'Telangana', aliases: ['nitw', 'nit warangal'] },
  { id: 'nit-calicut', name: 'National Institute of Technology Calicut', shortName: 'NIT Calicut', state: 'Kerala', aliases: ['nitc', 'nit calicut'] },
  { id: 'iiit-hyderabad', name: 'International Institute of Information Technology Hyderabad', shortName: 'IIIT Hyderabad', state: 'Telangana', aliases: ['iiith', 'iiit hyderabad'] },
  { id: 'iiit-delhi', name: 'Indraprastha Institute of Information Technology Delhi', shortName: 'IIIT Delhi', state: 'Delhi', aliases: ['iiitd', 'iiit delhi'] },
  { id: 'dtu-delhi', name: 'Delhi Technological University', shortName: 'DTU Delhi', state: 'Delhi', aliases: ['dtu', 'dce', 'delhi tech'] },
  { id: 'nsut-delhi', name: 'Netaji Subhas University of Technology', shortName: 'NSUT Delhi', state: 'Delhi', aliases: ['nsut', 'nsit'] },
  { id: 'vit-vellore', name: 'Vellore Institute of Technology (Vellore)', shortName: 'VIT Vellore', state: 'Tamil Nadu', aliases: ['vit', 'vit vellore'] },
  { id: 'vit-chennai', name: 'Vellore Institute of Technology (Chennai)', shortName: 'VIT Chennai', state: 'Tamil Nadu', aliases: ['vit chennai'] },
  { id: 'vit-bhopal', name: 'VIT Bhopal University', shortName: 'VIT Bhopal', state: 'Madhya Pradesh', aliases: ['vit bhopal'] },
  { id: 'vit-ap', name: 'VIT-AP University (Amaravati)', shortName: 'VIT AP', state: 'Andhra Pradesh', aliases: ['vit ap', 'vit amaravati'] },
  { id: 'manipal-mit', name: 'Manipal Institute of Technology (MIT Manipal)', shortName: 'MIT Manipal', state: 'Karnataka', aliases: ['manipal', 'mit manipal', 'mahe'] },
  { id: 'manipal-jaipur', name: 'Manipal University Jaipur', shortName: 'MU Jaipur', state: 'Rajasthan', aliases: ['muj', 'manipal jaipur'] },
  { id: 'srm-ktr', name: 'SRM Institute of Science and Technology (KTR Campus)', shortName: 'SRM KTR', state: 'Tamil Nadu', aliases: ['srm', 'srm ktr', 'srm chennai'] },
  { id: 'kiit-bbsr', name: 'Kalinga Institute of Industrial Technology', shortName: 'KIIT Bhubaneswar', state: 'Odisha', aliases: ['kiit', 'kiit university', 'kiit bbsr'] },
  { id: 'thapar-patiala', name: 'Thapar Institute of Engineering and Technology', shortName: 'Thapar Patiala', state: 'Punjab', aliases: ['thapar', 'tiet'] },
  { id: 'coep-pune', name: 'COEP Technological University', shortName: 'COEP Pune', state: 'Maharashtra', aliases: ['coep', 'college of engineering pune'] },
  { id: 'vjti-mumbai', name: 'Veermata Jijabai Technological Institute', shortName: 'VJTI Mumbai', state: 'Maharashtra', aliases: ['vjti', 'vjti mumbai'] },
  { id: 'rvce-bangalore', name: 'R.V. College of Engineering', shortName: 'RVCE Bangalore', state: 'Karnataka', aliases: ['rvce', 'rv college'] },
  { id: 'bmsce-bangalore', name: 'BMS College of Engineering', shortName: 'BMSCE Bangalore', state: 'Karnataka', aliases: ['bmsce', 'bms college'] },
  { id: 'msrit-bangalore', name: 'Ramaiah Institute of Technology', shortName: 'MSRIT Bangalore', state: 'Karnataka', aliases: ['msrit', 'ramaiah tech'] },
  { id: 'pes-bangalore', name: 'PES University (RR Campus)', shortName: 'PES Bangalore', state: 'Karnataka', aliases: ['pes', 'pesit', 'pes university'] },
  { id: 'amity-noida', name: 'Amity University Noida', shortName: 'Amity Noida', state: 'Uttar Pradesh', aliases: ['amity', 'amity noida'] },
  { id: 'chandigarh-univ', name: 'Chandigarh University', shortName: 'CU Punjab', state: 'Punjab', aliases: ['cu', 'chandigarh university'] },
  { id: 'lpu-punjab', name: 'Lovely Professional University', shortName: 'LPU Punjab', state: 'Punjab', aliases: ['lpu', 'lovely professional'] },
  { id: 'galgotias-univ', name: 'Galgotias University', shortName: 'Galgotias Greater Noida', state: 'Uttar Pradesh', aliases: ['galgotias', 'gu'] },
  { id: 'sharda-univ', name: 'Sharda University', shortName: 'Sharda Greater Noida', state: 'Uttar Pradesh', aliases: ['sharda', 'sharda university'] },
  { id: 'jadavpur-univ', name: 'Jadavpur University', shortName: 'Jadavpur Kolkata', state: 'West Bengal', aliases: ['ju', 'jadavpur'] },
  { id: 'iiest-shibpur', name: 'IIEST Shibpur', shortName: 'IIEST Shibpur', state: 'West Bengal', aliases: ['iiest', 'shibpur'] },
  { id: 'pec-chandigarh', name: 'Punjab Engineering College', shortName: 'PEC Chandigarh', state: 'Chandigarh', aliases: ['pec', 'pec chandigarh'] },
  { id: 'hbtu-kanpur', name: 'Harcourt Butler Technical University', shortName: 'HBTU Kanpur', state: 'Uttar Pradesh', aliases: ['hbtu', 'hbti'] },
  { id: 'mit-wpu-pune', name: 'MIT World Peace University', shortName: 'MIT-WPU Pune', state: 'Maharashtra', aliases: ['mit wpu', 'mit pune'] },
  { id: 'symbiosis-sit', name: 'Symbiosis Institute of Technology', shortName: 'SIT Pune', state: 'Maharashtra', aliases: ['sit pune', 'symbiosis tech'] },
];

export const STANDARD_PROGRAMMES = [
  'B.Tech / B.E.',
  'BCA',
  'B.Sc',
  'B.Com',
  'BBA',
  'MBBS',
  'B.Pharma',
  'M.Tech',
  'MCA',
  'MBA',
  'Diploma'
];

export const STANDARD_BRANCHES = [
  'Computer Science & Engg (CSE)',
  'Information Technology (IT)',
  'AI & Machine Learning (AIML)',
  'AI & Data Science (AIDS)',
  'Electronics & Communication (ECE)',
  'Electrical & Electronics (EEE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Chemical Engineering',
  'Biotechnology',
  'Aerospace Engineering',
  'General Science',
  'General Commerce',
  'General Management'
];

export const STANDARD_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '1', '2', '3', '4'];

export function searchColleges(query: string): CollegeItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return POPULAR_INDIAN_COLLEGES.slice(0, 8);

  return POPULAR_INDIAN_COLLEGES.filter(c => 
    c.name.toLowerCase().includes(q) ||
    c.shortName.toLowerCase().includes(q) ||
    c.state.toLowerCase().includes(q) ||
    c.aliases.some(a => a.toLowerCase().includes(q))
  ).slice(0, 10);
}
