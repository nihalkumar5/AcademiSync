with open('components/onboarding/OnboardingModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const [college, setCollege] = useState(profile?.college || '');",
    "const initialCollege = (profile?.college && profile.college !== 'Demo University') ? profile.college : '';\n  const [college, setCollege] = useState(initialCollege);"
)

with open('components/onboarding/OnboardingModal.tsx', 'w') as f:
    f.write(content)

print('Fixed demo college in OnboardingModal.tsx')
