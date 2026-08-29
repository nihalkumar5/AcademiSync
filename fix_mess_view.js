const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

code = code.replace(
  'const { messMenu, updateMessMenu } = useApp();',
  'const { messMenu, updateMessMenu, showToast } = useApp();'
);

code = code.replace(
  "alert('Invite link copied!');",
  "showToast('Copied', 'Invite link copied to clipboard!', 'success');"
);

fs.writeFileSync('components/mess/MessView.tsx', code);
