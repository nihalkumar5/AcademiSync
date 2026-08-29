const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

const shareButtonBlock = `<div className="flex flex-wrap items-center gap-3 mt-8">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2"
          >
            <Share className="w-4 h-4" /> Share
          </button>
          
        </div>`;

const newButtonsBlock = `<div className="flex flex-wrap items-center gap-3 mt-8">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2"
          >
            <Share className="w-4 h-4" /> Share
          </button>
          <button
            onClick={() => setIsReplacing(true)}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
          >
            Join Mess
          </button>
          <button
            onClick={() => setIsReplacing(true)}
            className="flex items-center justify-center h-10 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold transition-colors gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>
        </div>`;

code = code.replace(shareButtonBlock, newButtonsBlock);

if (!code.includes("import { Share, Sparkles }")) {
  code = code.replace("import { Share }", "import { Share, Sparkles }");
}

fs.writeFileSync('components/mess/MessView.tsx', code);
