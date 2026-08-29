const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

const badOrder = `  const { messMenu, updateMessMenu, showToast } = useApp();
  
  if (!messMenu) {
    return <MessOnboarding />;
  }

  const today = format(new Date(), 'EEEE');
  const [selectedDay, setSelectedDay] = useState(today);`;

const goodOrder = `  const { messMenu, updateMessMenu, showToast } = useApp();
  
  const today = format(new Date(), 'EEEE');
  const [selectedDay, setSelectedDay] = useState(today);
  const [isReplacing, setIsReplacing] = useState(false);

  if (!messMenu || isReplacing) {
    return <MessOnboarding onCancel={messMenu ? () => setIsReplacing(false) : undefined} />;
  }`;

code = code.replace(badOrder, goodOrder);
fs.writeFileSync('components/mess/MessView.tsx', code);
