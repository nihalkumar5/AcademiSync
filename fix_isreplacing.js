const fs = require('fs');
let code = fs.readFileSync('components/mess/MessView.tsx', 'utf8');

code = code.replace(
  'const [isReplacing, setIsReplacing] = useState(false);',
  'const [isReplacing, setIsReplacing] = useState<"join" | "import" | null>(null);'
);

code = code.replace(
  'if (!messMenu || isReplacing) {',
  'if (!messMenu || isReplacing !== null) {'
);

code = code.replace(
  'return <MessOnboarding onCancel={messMenu ? () => setIsReplacing(false) : undefined} />;',
  'return <MessOnboarding onCancel={messMenu ? () => setIsReplacing(null) : undefined} initialAction={isReplacing} />;'
);

code = code.replace(
  'onClick={() => setIsReplacing(true)}',
  'onClick={() => setIsReplacing("join")}'
);

code = code.replace(
  'onClick={() => setIsReplacing(true)}',
  'onClick={() => setIsReplacing("import")}'
);

fs.writeFileSync('components/mess/MessView.tsx', code);
