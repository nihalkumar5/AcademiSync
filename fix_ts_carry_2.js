const fs = require('fs');
let code = fs.readFileSync('components/carry/AddCustomItemModal.tsx', 'utf8');
code = code.replace("activeSubject.carryRequirements : DEFAULT_SUGGESTIONS", "(activeSubject?.carryRequirements || DEFAULT_SUGGESTIONS)");
fs.writeFileSync('components/carry/AddCustomItemModal.tsx', code);
