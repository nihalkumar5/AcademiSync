const fs = require('fs');
const file = 'context/AppContext.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /const newNotifs = checkAndGenerateSmartNotifications\([\s\S]*?if \(newNotifs\.length > 0\) \{[\s\S]*?const updated = \[\.\.\.newNotifs, \.\.\.prevNotifications\];\s*storage\.setNotifications\(updated\);[\s\S]*?return updated;\s*\}/;

const replacement = `const nowMs = Date.now();
        const prunedNotifications = prevNotifications.filter(n => {
          return nowMs - new Date(n.timestamp).getTime() < 24 * 60 * 60 * 1000;
        });

        const newNotifs = checkAndGenerateSmartNotifications(
          timetable,
          subjects,
          homework,
          events,
          settings,
          prunedNotifications,
          cancelledSessions
        );
        
        if (newNotifs.length > 0 || prunedNotifications.length !== prevNotifications.length) {
          const updated = [...newNotifs, ...prunedNotifications];
          storage.setNotifications(updated);
          
          if (newNotifs.length > 0) {
            showToast(newNotifs[0].title, newNotifs[0].message, 'info');
            newNotifs.forEach((n) => {
              triggerLocalNotification(n.title, n.message);
            });
          }
          return updated;
        }`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
