const fs = require('fs');

let code = fs.readFileSync('components/calendar/CalendarImportModal.tsx', 'utf8');

code = code.replace(/type: 'EVENT'/g, "type: 'event'");
code = code.replace(/type: 'OTHER'/g, "type: 'event'");
code = code.replace(/<option value="EXAM"/g, '<option value="exam"');
code = code.replace(/<option value="HOLIDAY"/g, '<option value="holiday"');
code = code.replace(/<option value="DEADLINE"/g, '<option value="assignment"');
code = code.replace(/<option value="EVENT"/g, '<option value="event"');

fs.writeFileSync('components/calendar/CalendarImportModal.tsx', code);
