const fs = require('fs');

// 1. InviteBatchmatesCard.tsx
let inviteCard = fs.readFileSync('components/dashboard/InviteBatchmatesCard.tsx', 'utf8');
inviteCard = inviteCard.replace(
  /const res = await shareLink\({[\s\S]*?}\);/,
  `const res = await shareLink({
      title: 'Join our Class Timetable',
      text: 'Hey! 👋 Join our class on Intersemester to get our synced timetable, next class alerts & shared updates:',
      url: inviteUrl,
      dialogTitle: 'Invite Classmates via',
    });`
);
fs.writeFileSync('components/dashboard/InviteBatchmatesCard.tsx', inviteCard);
console.log('Updated InviteBatchmatesCard.tsx');

// 2. BatchMembersModal.tsx
let batchModal = fs.readFileSync('components/batch/BatchMembersModal.tsx', 'utf8');
batchModal = batchModal.replace(
  /const res = await shareLink\({[\s\S]*?}\);/,
  `const res = await shareLink({
      title: 'Join our Class Timetable',
      text: 'Hey! 👋 Join our class on Intersemester to get our synced timetable, next class alerts & shared updates:',
      url: inviteUrl,
      dialogTitle: 'Invite Classmates via',
    });`
);
fs.writeFileSync('components/batch/BatchMembersModal.tsx', batchModal);
console.log('Updated BatchMembersModal.tsx');

// 3. SettingsView.tsx
let settingsView = fs.readFileSync('components/settings/SettingsView.tsx', 'utf8');
settingsView = settingsView.replace(
  /const res = await shareLink\(\{ title: 'Join Batch Timetable', text: 'Join our class batch on AcademiSync!', url: link, dialogTitle: 'Invite Classmates' \}\);/g,
  `const res = await shareLink({
      title: 'Join our Class Timetable',
      text: 'Hey! 👋 Join our class on Intersemester to get our synced timetable, next class alerts & shared updates:',
      url: link,
      dialogTitle: 'Invite Classmates via',
    });`
);
fs.writeFileSync('components/settings/SettingsView.tsx', settingsView);
console.log('Updated SettingsView.tsx');

// 4. MessView.tsx
let messView = fs.readFileSync('components/mess/MessView.tsx', 'utf8');
messView = messView.replace(
  /const res = await shareLink\({[\s\S]*?}\);/,
  `const res = await shareLink({
      title: 'Hostel Mess Menu',
      text: '🍛 Check out our weekly hostel mess menu & live meal timings on Intersemester:',
      url,
      dialogTitle: 'Share Mess Menu via',
    });`
);
fs.writeFileSync('components/mess/MessView.tsx', messView);
console.log('Updated MessView.tsx');

// 5. MessOnboarding.tsx
let messOnboard = fs.readFileSync('components/mess/MessOnboarding.tsx', 'utf8');
messOnboard = messOnboard.replace(
  /const res = await shareLink\({[\s\S]*?}\);/,
  `const res = await shareLink({
      title: 'Hostel Mess Menu',
      text: '🍛 Check out our weekly hostel mess menu & live meal timings on Intersemester:',
      url,
      dialogTitle: 'Share Mess Menu via',
    });`
);
fs.writeFileSync('components/mess/MessOnboarding.tsx', messOnboard);
console.log('Updated MessOnboarding.tsx');

// 6. ExamsView.tsx
let examsView = fs.readFileSync('components/exams/ExamsView.tsx', 'utf8');
examsView = examsView.replace(
  /const res = await shareLink\({[\s\S]*?}\);/,
  `const res = await shareLink({
      title: 'Exam Schedule',
      text: '🎯 Exam schedule is updated! Check our exam dates & syllabus countdown on Intersemester:',
      url: link,
      dialogTitle: 'Share Exam Schedule via',
    });`
);
fs.writeFileSync('components/exams/ExamsView.tsx', examsView);
console.log('Updated ExamsView.tsx');
