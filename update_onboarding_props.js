const fs = require('fs');
let code = fs.readFileSync('components/mess/MessOnboarding.tsx', 'utf8');

code = code.replace(
  'export const MessOnboarding: React.FC = () => {',
  `export const MessOnboarding: React.FC<{ onCancel?: () => void; initialAction?: 'join' | 'import' | null }> = ({ onCancel, initialAction }) => {`
);

code = code.replace(
  'const [showJoinInput, setShowJoinInput] = useState(false);',
  'const [showJoinInput, setShowJoinInput] = useState(initialAction === "join");'
);

code = code.replace(
  'const [showImportModal, setShowImportModal] = useState(false);',
  'const [showImportModal, setShowImportModal] = useState(initialAction === "import");'
);

// Add cancel button if onCancel is provided
const step1UI = `<div className="mb-12">
              <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">`;

const step1UIWithCancel = `<div className="mb-12 relative">
              {onCancel && (
                <button onClick={onCancel} className="absolute top-0 right-0 p-2 text-[#6B6B6B] hover:text-[#111111] dark:hover:text-[#FFFFFF]">
                  <X className="w-6 h-6" />
                </button>
              )}
              <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">`;

code = code.replace(step1UI, step1UIWithCancel);

fs.writeFileSync('components/mess/MessOnboarding.tsx', code);
