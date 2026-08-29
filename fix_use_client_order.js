const fs = require('fs');

const files = [
  'components/dashboard/InviteBatchmatesCard.tsx',
  'components/mess/MessView.tsx',
  'components/mess/MessOnboarding.tsx',
  'components/settings/SettingsView.tsx',
  'components/exams/ExamsView.tsx',
  'components/batch/BatchMembersModal.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Remove all occurrences of 'use client';
    content = content.replace(/['"]use client['"];?\n*/g, '');
    // Prepend 'use client'; at very top
    content = `'use client';\n\n` + content.trimStart();
    fs.writeFileSync(file, content);
    console.log('Fixed use client order for:', file);
  }
}
