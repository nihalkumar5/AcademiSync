const fs = require('fs');
let code = fs.readFileSync('components/notifications/NotificationCenter.tsx', 'utf8');

const target = `<span className="mt-0.5 opacity-80">{getCategoryIcon(n.category)}</span>`;
code = code.replace(target, ''); // Remove the lucide icon span

fs.writeFileSync('components/notifications/NotificationCenter.tsx', code);
