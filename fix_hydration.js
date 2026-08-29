const fs = require('fs');
let code = fs.readFileSync('context/AppContext.tsx', 'utf8');

const oldHydrationEnd = `    const loadedExams = storage.getExams();

    setProfileState(loadedProfile);`;

const newHydrationEnd = `    const loadedExams = storage.getExams();
    const loadedMessMenuStr = typeof window !== 'undefined' ? window.localStorage.getItem('intersemester_mess_menu_v1') : null;
    let loadedMessMenu = null;
    try {
      if (loadedMessMenuStr) loadedMessMenu = JSON.parse(loadedMessMenuStr);
    } catch(e) {}

    setMessMenu(loadedMessMenu);
    setProfileState(loadedProfile);`;

code = code.replace(oldHydrationEnd, newHydrationEnd);
fs.writeFileSync('context/AppContext.tsx', code);
