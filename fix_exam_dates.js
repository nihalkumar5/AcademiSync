const fs = require('fs');
let code = fs.readFileSync('components/exams/ExamImportModal.tsx', 'utf8');

const regex = /date: '2024-11-15',[\s\S]*?date: '2024-11-18',/m;

const date1 = `date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],`;
const date2 = `date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],`;

if (code.includes("date: '2024-11-15',")) {
  code = code.replace("date: '2024-11-15',", date1);
  code = code.replace("date: '2024-11-18',", date2);
  fs.writeFileSync('components/exams/ExamImportModal.tsx', code);
}
