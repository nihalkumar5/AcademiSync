const fs = require('fs');

let code = fs.readFileSync('components/homework/HomeworkCard.tsx', 'utf8');
code = code.replace("profile?.role !== 'CLASS_REPRESENTATIVE'", "profile?.role !== 'cr'");
fs.writeFileSync('components/homework/HomeworkCard.tsx', code);
