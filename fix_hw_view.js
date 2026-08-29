const fs = require('fs');
let code = fs.readFileSync('components/homework/HomeworkView.tsx', 'utf8');

if (!code.includes('showToast,')) {
  code = code.replace(
    'deleteHomework,\n  } = useApp();',
    'deleteHomework,\n    showToast,\n  } = useApp();'
  );
}

code = code.replace(
  "alert('Task share link copied to clipboard!'); // Basic fallback",
  "showToast('Copied', 'Task share link copied to clipboard!', 'success');"
);

fs.writeFileSync('components/homework/HomeworkView.tsx', code);
