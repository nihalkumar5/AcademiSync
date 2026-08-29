const fs = require('fs');

let code = fs.readFileSync('components/homework/HomeworkView.tsx', 'utf8');
code = code.replace(/homeworkToEdit=\{editHomework\}/g, "homeworkToEdit={editHomework || undefined}");
code = code.replace(/prefilledData=\{prefilledData\}/g, "prefilledData={prefilledData || undefined}");
fs.writeFileSync('components/homework/HomeworkView.tsx', code);
