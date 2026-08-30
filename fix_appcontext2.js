const fs = require('fs');
let content = fs.readFileSync('./context/AppContext.tsx', 'utf8');

const helper = `
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
`;

if (!content.includes('generateInviteCode')) {
  content = content.replace('const AppContext = createContext', helper + '\\nconst AppContext = createContext');
  fs.writeFileSync('./context/AppContext.tsx', content);
  console.log('Fixed properly');
}
