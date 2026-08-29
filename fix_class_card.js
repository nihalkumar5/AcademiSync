const fs = require('fs');
let code = fs.readFileSync('components/timetable/ClassCard.tsx', 'utf8');

// Restore MapPin import if missing, wait it might be missing?
if (!code.includes('MapPin')) {
  code = code.replace('import { MoreHorizontal, Edit2, Trash2 } from \'lucide-react\';', 'import { MoreHorizontal, Edit2, Trash2, MapPin } from \'lucide-react\';');
}

// Remove the +2 faculty logic
code = code.replace(
  /  \/\/ Format Faculty string \(handle "\+ 2 faculty" logic\)[\s\S]*?  const roomStr =/,
  `  const displayFaculty = session.faculty || subject?.facultyName || '';
  const roomStr =`
);

// Replace the ⌖ string with MapPin
code = code.replace(
  '<span className="shrink-0">⌖ {roomStr}</span>',
  '<span className="shrink-0 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {roomStr}</span>'
);

fs.writeFileSync('components/timetable/ClassCard.tsx', code);
