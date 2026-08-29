import re

with open('components/onboarding/OnboardingModal.tsx', 'r') as f:
    content = f.read()

# Replace the header section in Step 4
old_header = """              {/* Header with Perfect Hierarchy */}
              <div className="flex flex-col mb-6">
                <h2 className="text-[26px] font-bold text-[#111111] tracking-tight">
                  Connect your batch
                </h2>
                <p className="text-[14px] text-[#6F6F6F] mt-1 leading-relaxed">
                  Join your classmates and sync your academic schedule.
                </p>
              </div>"""

new_header = """              {/* Signature Intersemester Editorial Header */}
              <div className="flex flex-col mb-6 pt-1">
                <h2 className="text-[34px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px]">
                  Connect,<br />
                  Batch,<br />
                  Timetable
                </h2>
                <p className="text-[13.5px] font-normal text-[#6B6B6B] leading-[19px] mt-3">
                  Join your classmates and sync your academic schedule.
                </p>
              </div>"""

if old_header in content:
    content = content.replace(old_header, new_header)
else:
    # Regex replacement if whitespace slightly differs
    content = re.sub(
        r'<h2 className="text-\[26px\] font-bold text-\[#111111\] tracking-tight">\s*Connect your batch\s*</h2>\s*<p className="text-\[14px\] text-\[#6F6F6F\] mt-1 leading-relaxed">\s*Join your classmates and sync your academic schedule\.\s*</p>',
        """<h2 className="text-[34px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px]">
                  Connect,<br />
                  Batch,<br />
                  Timetable
                </h2>
                <p className="text-[13.5px] font-normal text-[#6B6B6B] leading-[19px] mt-3">
                  Join your classmates and sync your academic schedule.
                </p>""",
        content
    )

with open('components/onboarding/OnboardingModal.tsx', 'w') as f:
    f.write(content)

print('Updated heading in OnboardingModal.tsx with signature theme!')
