const fs = require('fs');
let code = fs.readFileSync('context/AppContext.tsx', 'utf8');

// 1. Add to currentState
code = code.replace(
  'rescheduledSessions,\n      lastUpdated: now,',
  'rescheduledSessions,\n      messMenu,\n      lastUpdated: now,'
);

// 2. Add to onSnapshot
code = code.replace(
  'if (data.rescheduledSessions) { setRescheduledSessionsState(data.rescheduledSessions); storage.setRescheduledSessions(data.rescheduledSessions); }',
  'if (data.rescheduledSessions) { setRescheduledSessionsState(data.rescheduledSessions); storage.setRescheduledSessions(data.rescheduledSessions); }\n        if (data.messMenu !== undefined) { setMessMenu(data.messMenu); if(data.messMenu) { window.localStorage.setItem("intersemester_mess_menu_v1", JSON.stringify(data.messMenu)); } else { window.localStorage.removeItem("intersemester_mess_menu_v1"); } }'
);

fs.writeFileSync('context/AppContext.tsx', code);
