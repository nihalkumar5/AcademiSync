const fs = require('fs');

// 1. MessView.tsx
let messView = fs.readFileSync('components/mess/MessView.tsx', 'utf8');
if (!messView.includes('shareLink')) {
  messView = `import { shareLink } from '@/lib/shareUtils';\n` + messView;
}
messView = messView.replace(
  `  const handleCopyLink = () => {\n    const url = \`\${window.location.origin}/join/\${messMenu.id}\`;\n    navigator.clipboard.writeText(url);\n    showToast('Copied', 'Invite link copied to clipboard!', 'success');\n  };`,
  `  const handleShare = async () => {\n    const url = \`\${window.location.origin}/join/\${messMenu.id}\`;\n    const res = await shareLink({\n      title: 'Hostel Mess Menu',\n      text: 'Check out our weekly hostel mess menu on Intersemester!',\n      url,\n      dialogTitle: 'Share Mess Menu',\n    });\n    if (res === 'copied') {\n      showToast('Copied', 'Invite link copied to clipboard!', 'success');\n    }\n  };`
);
messView = messView.replace(`onClick={handleCopyLink}`, `onClick={handleShare}`);
fs.writeFileSync('components/mess/MessView.tsx', messView);
console.log('Updated MessView.tsx');

// 2. MessOnboarding.tsx
let messOnboard = fs.readFileSync('components/mess/MessOnboarding.tsx', 'utf8');
if (!messOnboard.includes('shareLink')) {
  messOnboard = `import { shareLink } from '@/lib/shareUtils';\n` + messOnboard;
}
messOnboard = messOnboard.replace(
  `  const handleCopyLink = () => {\n    const url = \`\${window.location.origin}/join/\${messId}\`;\n    navigator.clipboard.writeText(url);\n    setCopying(true);\n    setTimeout(() => setCopying(false), 2000);\n  };`,
  `  const handleCopyLink = async () => {\n    const url = \`\${window.location.origin}/join/\${messId}\`;\n    const res = await shareLink({\n      title: 'Hostel Mess Menu',\n      text: 'Join and view our hostel mess menu on Intersemester!',\n      url,\n      dialogTitle: 'Share Mess Menu',\n    });\n    if (res === 'copied') {\n      setCopying(true);\n      setTimeout(() => setCopying(false), 2000);\n    }\n  };`
);
fs.writeFileSync('components/mess/MessOnboarding.tsx', messOnboard);
console.log('Updated MessOnboarding.tsx');

// 3. InviteBatchmatesCard.tsx
let inviteCard = fs.readFileSync('components/dashboard/InviteBatchmatesCard.tsx', 'utf8');
if (!inviteCard.includes('shareLink')) {
  inviteCard = `import { shareLink } from '@/lib/shareUtils';\n` + inviteCard;
}
inviteCard = inviteCard.replace(
  /const handleInvite = async \(\) => {[\s\S]*?};/,
  `const handleInvite = async () => {
    if (!profile?.batchKey) return;
    const inviteUrl = \`\${window.location.origin}/?invite=\${profile.batchKey}\`;
    const res = await shareLink({
      title: 'Join our Batch Timetable',
      text: 'Join our class batch on AcademiSync to sync the timetable, exams, and shared homework!',
      url: inviteUrl,
      dialogTitle: 'Invite Batchmates',
    });
    if (res === 'copied') {
      showToast('Link Copied', 'Batch invite link copied to clipboard.', 'success');
    }
  };`
);
fs.writeFileSync('components/dashboard/InviteBatchmatesCard.tsx', inviteCard);
console.log('Updated InviteBatchmatesCard.tsx');

// 4. BatchMembersModal.tsx
let batchModal = fs.readFileSync('components/batch/BatchMembersModal.tsx', 'utf8');
if (!batchModal.includes('shareLink')) {
  batchModal = `import { shareLink } from '@/lib/shareUtils';\n` + batchModal;
}
batchModal = batchModal.replace(
  /const handleCopyInvite = async \(\) => {[\s\S]*?};/,
  `const handleCopyInvite = async () => {
    const inviteUrl = \`\${window.location.origin}/?invite=\${profile.batchKey}\`;
    const res = await shareLink({
      title: 'Join Batch Timetable',
      text: 'Join our class batch on AcademiSync to sync timetable and schedules!',
      url: inviteUrl,
      dialogTitle: 'Invite Batchmate',
    });
    if (res === 'copied') {
      showToast('Invite Copied', 'Share this link with your classmates!', 'success');
    }
  };`
);
fs.writeFileSync('components/batch/BatchMembersModal.tsx', batchModal);
console.log('Updated BatchMembersModal.tsx');

// 5. SettingsView.tsx
let settingsView = fs.readFileSync('components/settings/SettingsView.tsx', 'utf8');
if (!settingsView.includes('shareLink')) {
  settingsView = `import { shareLink } from '@/lib/shareUtils';\n` + settingsView;
}
// Replace share timetable with batch in settings
settingsView = settingsView.replace(
  `                          const code = await shareTimetableWithBatch();\n                          const link = \`\${window.location.origin}/?invite=\${code}\`;\n                          navigator.clipboard.writeText(link);\n                          showToast('Invite Link Copied', 'Share this link with your classmates!', 'success');`,
  `                          const code = await shareTimetableWithBatch();\n                          const link = \`\${window.location.origin}/?invite=\${code}\`;\n                          const res = await shareLink({ title: 'Join Batch Timetable', text: 'Join our class batch on AcademiSync!', url: link, dialogTitle: 'Invite Classmates' });\n                          if (res === 'copied') showToast('Invite Link Copied', 'Share this link with your classmates!', 'success');`
);
settingsView = settingsView.replace(
  `                      const code = await shareTimetableWithBatch();\n                      navigator.clipboard.writeText(\`\${window.location.origin}/?invite=\${code}\`);\n                      showToast('Link Copied', 'Invite link copied to clipboard!', 'success');`,
  `                      const code = await shareTimetableWithBatch();\n                      const link = \`\${window.location.origin}/?invite=\${code}\`;\n                      const res = await shareLink({ title: 'Join Batch Timetable', text: 'Join our class batch on AcademiSync!', url: link, dialogTitle: 'Invite Classmates' });\n                      if (res === 'copied') showToast('Link Copied', 'Invite link copied to clipboard!', 'success');`
);
fs.writeFileSync('components/settings/SettingsView.tsx', settingsView);
console.log('Updated SettingsView.tsx');

// 6. ExamsView.tsx
let examsView = fs.readFileSync('components/exams/ExamsView.tsx', 'utf8');
if (!examsView.includes('shareLink')) {
  examsView = `import { shareLink } from '@/lib/shareUtils';\n` + examsView;
}
examsView = examsView.replace(
  `                  const link = \`\${window.location.origin}/?exams_invite=\${code}\`;\n                  navigator.clipboard.writeText(link);\n                  showToast('Exams Shared!', 'Schedule published & link copied', 'success');`,
  `                  const link = \`\${window.location.origin}/?exams_invite=\${code}\`;\n                  const res = await shareLink({ title: 'Exam Schedule', text: 'Check out our exam schedule on AcademiSync!', url: link, dialogTitle: 'Share Exam Schedule' });\n                  if (res === 'copied') showToast('Exams Shared!', 'Schedule published & link copied', 'success');`
);
fs.writeFileSync('components/exams/ExamsView.tsx', examsView);
console.log('Updated ExamsView.tsx');
