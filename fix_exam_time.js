const fs = require('fs');
let code = fs.readFileSync('components/exams/ExamsView.tsx', 'utf8');

const badTime = `            {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {nextExam.time && \\\` • \\\${nextExam.time}\\\`}
          </p>`;

// We don't have to match string templates exactly, just replace it using regex.
const regex = /\{new Date\(nextExam\.date\)\.toLocaleDateString\('en-US', \{ weekday: 'short', month: 'short', day: 'numeric' \}\)\}\n\s*\{nextExam\.time && ` • \$\{nextExam\.time\}`\}/;

const replacement = `            {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' • '}
            {new Date(nextExam.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

code = code.replace(regex, replacement);
fs.writeFileSync('components/exams/ExamsView.tsx', code);
