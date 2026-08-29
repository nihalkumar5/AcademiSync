const fs = require('fs');
let code = fs.readFileSync('components/exams/ExamsView.tsx', 'utf8');

const oldCard = `<div className="mb-12 border border-[#E5E5E5] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-5 flex flex-col md:flex-row md:items-center justify-between rounded-none gap-4">
          <div className="flex flex-col">
            <p className="text-[14px] text-[#111111] dark:text-[#FFFFFF] font-medium leading-relaxed">
              {nextExam.subjectName}
            </p>
            <p className="text-[10px] font-bold tracking-[1px] uppercase text-[#E55B4B] mt-1">
              NEXT EXAM
            </p>
          </div>
          <div className="flex items-center">
            <span className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF]">{getCountdown(nextExam.date)}</span>
          </div>
        </div>`;

const newCard = `<div className="mb-12 flex flex-col p-5 bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-indigo-600 dark:text-indigo-400">
                NEXT EXAM
              </span>
            </div>
            <span className="text-[12px] font-bold text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-800/50 px-2 py-1 rounded-md">
              {getCountdown(nextExam.date)} left
            </span>
          </div>
          <h3 className="text-[18px] font-bold text-indigo-950 dark:text-white mb-2">{nextExam.subjectName}</h3>
          <p className="text-[14px] font-medium text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
            {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {nextExam.time && \` • \${nextExam.time}\`}
          </p>
        </div>`;

code = code.replace(oldCard, newCard);
fs.writeFileSync('components/exams/ExamsView.tsx', code);
