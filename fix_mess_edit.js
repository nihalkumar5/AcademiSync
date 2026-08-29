const fs = require('fs');
let code = fs.readFileSync('components/mess/MessOnboarding.tsx', 'utf8');

// Add isEditing state
if (!code.includes('const [isEditing, setIsEditing] = useState(false);')) {
  code = code.replace(
    'const [extractedData, setExtractedData] = useState<any>(null);',
    'const [extractedData, setExtractedData] = useState<any>(null);\n  const [isEditing, setIsEditing] = useState(false);'
  );
}

// Replace step 3
const step3Start = code.indexOf('{step === 3 && extractedData');
const step3End = code.indexOf('{step === 4 && (', step3Start);

const newStep3 = `{step === 3 && extractedData && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-full py-4 max-h-[80vh]"
          >
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-6 text-center">
              {isEditing ? 'EDIT YOUR MENU' : 'YOUR MENU IS READY'}
            </p>

            <div className="flex-1 overflow-y-auto mb-8 pr-2 flex flex-col gap-6">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const dayData = extractedData[day] || {};
                // If not editing, maybe only show Monday to save space, but let's just show all to be thorough
                if (!isEditing && day !== 'Monday') return null;

                return (
                  <div key={day} className="bg-[#FFFFFF] dark:bg-[#111111] border border-[#D8D8D8] dark:border-[#333333] p-6">
                    <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-6 border-b border-[#D8D8D8] dark:border-[#333333] pb-2">
                      {day.toUpperCase()} {(!isEditing && day === 'Monday') && <span className="text-[11px] text-[#6F6F6F] ml-2 font-normal lowercase">(preview)</span>}
                    </h3>
                    
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => {
                      const items = dayData[meal] || [];
                      if (!isEditing && items.length === 0) return null;
                      
                      return (
                        <div key={meal} className="mb-6 last:mb-0">
                          <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-[#6F6F6F] mb-2">
                            {meal}
                          </h4>
                          {isEditing ? (
                            <input
                              type="text"
                              value={items.join(', ')}
                              onChange={(e) => {
                                const newItems = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                setExtractedData({
                                  ...extractedData,
                                  [day]: {
                                    ...dayData,
                                    [meal]: newItems
                                  }
                                });
                              }}
                              placeholder="e.g. Aloo Paratha, Curd"
                              className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2.5 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
                            />
                          ) : (
                            <p className="text-[15px] text-[#111111] dark:text-[#FFFFFF] leading-relaxed">
                              {items.join(' · ')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {isEditing ? (
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="w-full h-12 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[14px] font-medium"
                >
                  Done Editing
                </button>
              ) : (
                <>
                  <Button onClick={handlePublish} className="w-full flex justify-center items-center gap-2 h-12 text-[14px]">
                    Looks good <ArrowRight className="w-4 h-4" />
                  </Button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full h-12 border border-[#D8D8D8] dark:border-[#333333] text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    Edit menu
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        `;

code = code.slice(0, step3Start) + newStep3 + code.slice(step3End);
fs.writeFileSync('components/mess/MessOnboarding.tsx', code);
