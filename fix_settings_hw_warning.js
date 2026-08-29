const fs = require('fs');
let code = fs.readFileSync('components/settings/SettingsView.tsx', 'utf8');

const target = `            <div 
              onClick={() => {
                showToast('Testing Native Alarm', 'Closing app for 5 seconds to test background notification...', 'info');`;

const insertion = `            <div 
              onClick={() => { setActiveSetting('hwWarning'); setShowSettingModal(true); }}
              className="flex items-center justify-between py-5 border-b border-[#D8D8D8] dark:border-[#333333] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-5 px-5 sm:mx-0 sm:px-0 sm:hover:bg-transparent group"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF] stroke-[1.5]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none group-hover:underline underline-offset-2">Task & Homework Warning</span>
                  <span className="text-[12px] text-[#6F6F6F]">Days before deadline to remind</span>
                </div>
              </div>
              <span className="text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF]">{settings.homeworkWarningDays} day{settings.homeworkWarningDays > 1 ? 's' : ''}</span>
            </div>
            
            <div 
              onClick={() => {
                showToast('Testing Native Alarm', 'Closing app for 5 seconds to test background notification...', 'info');`;

code = code.replace(target, insertion);
fs.writeFileSync('components/settings/SettingsView.tsx', code);
