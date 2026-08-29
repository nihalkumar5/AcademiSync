const fs = require('fs');
let code = fs.readFileSync('components/timetable/WeeklyTimetable.tsx', 'utf8');

const oldEmptyState = `<EmptyState
                icon={<CalendarDays className="w-6 h-6 text-indigo-400" />}
                title={\`No classes on \${selectedMobileDay}\`}
                description="Take a break or schedule a class manually."
                actionLabel="Add Class for this day"
                onAction={() => handleAddForDay(selectedMobileDay)}
              />`;

const newEmptyState = `<EmptyState
                icon={<MonochromeIllustration type="no-classes" size={48} />}
                title={\`NO CLASSES ON \${selectedMobileDay.toUpperCase()}\`}
                description="Take a break or schedule a class manually."
                actionLabel="Add Class for this day"
                onAction={() => handleAddForDay(selectedMobileDay)}
              />`;

code = code.replace(oldEmptyState, newEmptyState);

// Add MonochromeIllustration import if not exists
if (!code.includes('MonochromeIllustration')) {
  code = code.replace(
    'import { EmptyState } from \'../ui/EmptyState\';',
    'import { EmptyState } from \'../ui/EmptyState\';\nimport { MonochromeIllustration } from \'../ui/MonochromeIllustration\';'
  );
}

fs.writeFileSync('components/timetable/WeeklyTimetable.tsx', code);
