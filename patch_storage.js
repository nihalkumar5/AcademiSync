const fs = require('fs');
const file = 'lib/storage.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "settings: storage.getSettings(),",
  "settings: storage.getSettings(),\n      events: storage.getEvents(),\n      exams: storage.getExams(),\n      cancelledSessions: storage.getCancelledSessions(),"
);

code = code.replace(
  "if (data.settings) storage.setSettings(data.settings);",
  "if (data.settings) storage.setSettings(data.settings);\n      if (data.events) storage.setEvents(data.events);\n      if (data.exams) storage.setExams(data.exams);\n      if (data.cancelledSessions) storage.setCancelledSessions(data.cancelledSessions);"
);

fs.writeFileSync(file, code);
console.log('Patched storage');
