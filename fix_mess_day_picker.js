const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

// Add selectedDay state
code = code.replace(
  'const todayMenu = messMenu.menu?.[today] || {};',
  `const [selectedDay, setSelectedDay] = useState(today);
  const selectedMenu = messMenu.menu?.[selectedDay] || {};`
);

// Remove the old Today Section and Full Week Section
const startRemove = code.indexOf('{/* TODAY SECTION */}');
const endRemove = code.lastIndexOf('</div>\n    </div>');

const newContent = `{/* DAY PICKER */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {days.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = today === day;
          
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={\`flex flex-col items-center justify-center min-w-[70px] h-[60px] border transition-colors cursor-pointer shrink-0 \${
                isSelected 
                  ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111]' 
                  : 'border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A]'
              }\`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold">{day.slice(0, 3)}</span>
                {isToday && (
                  <span className={\`w-1.5 h-1.5 rounded-full \${isSelected ? 'bg-white dark:bg-black' : 'bg-black dark:bg-white'}\`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* SELECTED DAY MENU */}
      <div className="flex flex-col gap-6 mt-2">
        <h3 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide">
          {selectedDay.toUpperCase()}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
            const items = selectedMenu[meal];
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
          {Object.keys(selectedMenu).length === 0 && (
            <div className="col-span-full p-8 border border-dashed border-[#D8D8D8] dark:border-[#333333] text-center">
              <p className="text-[14px] text-[#6F6F6F]">No menu data available for {selectedDay}.</p>
            </div>
          )}
        </div>
      </div>`;

code = code.substring(0, startRemove) + newContent + '\n' + code.substring(endRemove);
fs.writeFileSync('components/mess/MessView.tsx', code);
