const fs = require('fs');

let code = fs.readFileSync('components/carry/AddCustomItemModal.tsx', 'utf8');
code = code.replace("activeSubject?.carryRequirements?.length > 0", "(activeSubject?.carryRequirements?.length ?? 0) > 0");
fs.writeFileSync('components/carry/AddCustomItemModal.tsx', code);
