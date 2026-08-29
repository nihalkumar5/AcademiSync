const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

const liveMealCardCode = `
const parsedTimings = [
  { name: 'Breakfast', start: 8 * 60, end: 10 * 60 },
  { name: 'Lunch', start: 12 * 60 + 30, end: 14 * 60 + 30 },
  { name: 'Snacks', start: 16 * 60 + 30, end: 17 * 60 + 30 },
  { name: 'Dinner', start: 19 * 60 + 30, end: 21 * 60 + 30 },
];

const LiveMealCard = ({ todayMenu }: { todayMenu: any }) => {
  const [timeState, setTimeState] = React.useState<{ status: string; meal: string; timeLeft: string; items: string[] } | null>(null);

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      
      let serving = parsedTimings.find(m => currentMins >= m.start && currentMins < m.end);
      if (serving) {
        const diff = serving.end - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const items = todayMenu?.[serving.name] || [];
        setTimeState({
          status: 'SERVING NOW',
          meal: serving.name,
          timeLeft: \`Ends in \${h > 0 ? \`\${h}h \` : ''}\${m}m\`,
          items: Array.isArray(items) ? items : []
        });
        return;
      }
      
      let next = parsedTimings.find(m => m.start > currentMins);
      if (next) {
        const diff = next.start - currentMins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const items = todayMenu?.[next.name] || [];
        setTimeState({
          status: 'UP NEXT',
          meal: next.name,
          timeLeft: \`Starts in \${h > 0 ? \`\${h}h \` : ''}\${m}m\`,
          items: Array.isArray(items) ? items : []
        });
        return;
      }
      
      // Tomorrow's breakfast
      const diff = (24 * 60 - currentMins) + 8 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setTimeState({
        status: 'UP NEXT (TOMORROW)',
        meal: 'Breakfast',
        timeLeft: \`Starts in \${h > 0 ? \`\${h}h \` : ''}\${m}m\`,
        items: [] // Can't easily know tomorrow's menu here without passing full menu, keeping empty for simplicity
      });
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [todayMenu]);

  if (!timeState) return null;

  return (
    <div className="flex flex-col p-5 bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-2xl mb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {timeState.status === 'SERVING NOW' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span className={\`relative inline-flex rounded-full h-2.5 w-2.5 \${timeState.status === 'SERVING NOW' ? 'bg-green-500' : 'bg-indigo-500'}\`}></span>
          </span>
          <span className={\`text-[11px] font-bold tracking-[1.5px] uppercase \${timeState.status === 'SERVING NOW' ? 'text-green-700 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}\`}>
            {timeState.status}
          </span>
        </div>
        <span className="text-[12px] font-bold text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-800/50 px-2 py-1 rounded-md">
          {timeState.timeLeft}
        </span>
      </div>
      <h3 className="text-[18px] font-bold text-indigo-950 dark:text-white mb-2">{timeState.meal}</h3>
      {timeState.items.length > 0 && (
        <p className="text-[14px] font-medium text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
          {timeState.items.join(' · ')}
        </p>
      )}
    </div>
  );
};
`;

// Insert the component right after the imports
code = code.replace(
  'const days = [\'Monday\', \'Tuesday\', \'Wednesday\', \'Thursday\', \'Friday\', \'Saturday\', \'Sunday\'];',
  'const days = [\'Monday\', \'Tuesday\', \'Wednesday\', \'Thursday\', \'Friday\', \'Saturday\', \'Sunday\'];\n\n' + liveMealCardCode
);

// Add the component right above {/* DAY PICKER */}
code = code.replace(
  '{/* DAY PICKER */}',
  `<LiveMealCard todayMenu={messMenu.menu?.[today] || {}} />\n\n      {/* DAY PICKER */}`
);

fs.writeFileSync('components/mess/MessView.tsx', code);
