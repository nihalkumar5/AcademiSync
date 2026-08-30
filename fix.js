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

content = content.replace('const AppContext = createContext<AppContextType | undefined>(undefined);', helper + '\\nconst AppContext = createContext<AppContextType | undefined>(undefined);');
fs.writeFileSync('./context/AppContext.tsx', content);
console.log('Fixed for sure');
