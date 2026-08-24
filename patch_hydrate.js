const fs = require('fs');
const file = 'context/AppContext.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const loadedCancelled = storage.getCancelledSessions();",
  "const loadedCancelled = storage.getCancelledSessions();\n    const loadedExams = storage.getExams();"
);

code = code.replace(
  "setEventsState(loadedEvents);",
  "setEventsState(loadedEvents);\n    setExamsState(loadedExams);"
);

fs.writeFileSync(file, code);
