const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

code = code.replace(
  "bg-white dark:bg-black' : 'bg-black dark:bg-white'}",
  "bg-white' : 'bg-indigo-500'}"
);

fs.writeFileSync('components/mess/MessView.tsx', code);
