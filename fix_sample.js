const fs = require('fs');
let code = fs.readFileSync('components/mess/MessOnboarding.tsx', 'utf8');

code = code.replace(
  /data = \{ success: true, data: \{\s*menu: \{/,
  "data = { success: true, data: {"
);

code = code.replace(
  /Sunday: \{ Breakfast: \["Bread Omelette", "Toast", "Juice"\], Lunch: \["Veg Biryani", "Raita"\], Snacks: \["French Fries", "Cold Drink"\], Dinner: \["Dal Bati", "Churma"\] \}\s*\}\s*\};\s*\}\s*else \{/g,
  `Sunday: { Breakfast: ["Bread Omelette", "Toast", "Juice"], Lunch: ["Veg Biryani", "Raita"], Snacks: ["French Fries", "Cold Drink"], Dinner: ["Dal Bati", "Churma"] }
        };
      } else {`
);

fs.writeFileSync('components/mess/MessOnboarding.tsx', code);
