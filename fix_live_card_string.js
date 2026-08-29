const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

code = code.replace(
  /Array\.isArray\(items\) \? items : \[\]/g,
  "Array.isArray(items) ? items : (typeof items === 'string' ? [items] : [])"
);

fs.writeFileSync('components/mess/MessView.tsx', code);
