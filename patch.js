const fs = require('fs');
const file = 'context/AppContext.tsx';
let code = fs.readFileSync(file, 'utf8');

const upSyncRegex = /const currentState = \{\s*profile, subjects, timetable, homework, carryItems, notifications, events, exams, settings, cancelledSessions\s*\};/;
const upSyncReplacement = `const now = Date.now();
    if (typeof window !== 'undefined') window.localStorage.setItem('iiitnr_last_updated', now.toString());
    const currentState = {
      profile, subjects, timetable, homework, carryItems, notifications, events, exams, settings, cancelledSessions, lastUpdated: now
    };`;

code = code.replace(upSyncRegex, upSyncReplacement);

const downSyncRegex = /const data = docSnap\.data\(\);\s*remoteStateString\.current = JSON\.stringify\(data\);/;
const downSyncReplacement = `const data = docSnap.data();
        
        if (typeof window !== 'undefined') {
          const localLastUpdated = parseInt(window.localStorage.getItem('iiitnr_last_updated') || '0', 10);
          if (data.lastUpdated && data.lastUpdated < localLastUpdated) {
            console.log('Firebase data is older than local data. Skipping down-sync to prevent clobbering.');
            return;
          }
        }
        
        remoteStateString.current = JSON.stringify(data);`;

code = code.replace(downSyncRegex, downSyncReplacement);

fs.writeFileSync(file, code);
console.log('Patched successfully');
