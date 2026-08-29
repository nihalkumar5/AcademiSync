const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

const oldToday = `<div className="flex flex-col gap-6">
        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
          const items = todayMenu[meal];
          if (!items || items.length === 0) return null;
          return (
            <div key={meal} className="flex flex-col">
              <h4 className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] mb-0.5">
                {meal}
              </h4>
              <p className="text-[12px] font-mono text-[#A0A0A0] mb-2">
                {mealTimings[meal]}
              </p>
              <p className="text-[15px] text-[#111111] dark:text-[#FFFFFF] leading-relaxed">
                {Array.isArray(items) ? items.join(' · ') : items}
              </p>
            </div>
          );
        })}
        {Object.keys(todayMenu).length === 0 && (
          <div className="p-8 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-center">
            <p className="text-[14px] text-[#6F6F6F]">No menu data available for today.</p>
          </div>
        )}
      </div>`;

const newToday = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
          const items = todayMenu[meal];
          if (!items || items.length === 0) return null;
          return (
            <div key={meal} className="flex flex-col p-5 border border-[#D9D9D6] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF]">
                  {meal}
                </h4>
                <p className="text-[10px] font-mono text-[#A0A0A0] px-2 py-1 bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#333333]">
                  {mealTimings[meal]}
                </p>
              </div>
              <p className="text-[15px] font-medium text-[#111111] dark:text-[#FFFFFF] leading-relaxed">
                {Array.isArray(items) ? items.join(' · ') : items}
              </p>
            </div>
          );
        })}
        {Object.keys(todayMenu).length === 0 && (
          <div className="col-span-full p-8 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-center">
            <p className="text-[14px] text-[#6F6F6F]">No menu data available for today.</p>
          </div>
        )}
      </div>`;

code = code.replace(oldToday, newToday);
fs.writeFileSync('components/mess/MessView.tsx', code);
