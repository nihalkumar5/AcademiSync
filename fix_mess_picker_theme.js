const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

const oldPickerClass = 'className={`flex flex-col items-center justify-center min-w-[70px] h-[60px] border transition-colors cursor-pointer shrink-0 ${';
const newPickerClass = 'className={`flex flex-col items-center justify-center min-w-[70px] h-[60px] transition-all cursor-pointer shrink-0 ${';

code = code.replace(oldPickerClass, newPickerClass);

const oldSelected = `isSelected 
                  ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111]' 
                  : 'border border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A]'`;

// Actually in my code it was:
const actualOldSelected = `isSelected 
                  ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111]' 
                  : 'border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A]'`;

const newSelected = `isSelected 
                  ? 'bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 border border-indigo-600' 
                  : 'border border-[#D9D9D6] dark:border-[#333333] bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-none'`;

code = code.replace(actualOldSelected, newSelected);

fs.writeFileSync('components/mess/MessView.tsx', code);
