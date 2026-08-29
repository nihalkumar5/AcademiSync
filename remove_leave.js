const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

const buttonToRemove = `<button
            onClick={() => {
              if (confirm('Are you sure you want to leave this mess?')) {
                updateMessMenu(null);
              }
            }}
            className="flex items-center justify-center h-10 px-4 bg-[#FF3333]/10 text-[#FF3333] text-[13px] font-semibold hover:bg-[#FF3333]/20 transition-colors gap-2 cursor-pointer"
          >
            Leave Mess
          </button>`;

code = code.replace(buttonToRemove, '');
fs.writeFileSync('components/mess/MessView.tsx', code);
