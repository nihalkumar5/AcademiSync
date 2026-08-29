const mealTimings = {
  Breakfast: '8:00 - 10:00',
  Lunch: '12:30 - 2:30', // PM
  Snacks: '4:30 - 5:30', // PM
  Dinner: '7:30 - 9:30', // PM
};

const parseTime = (timeStr) => {
    let [time, modifier] = timeStr.trim().split(' ');
    // handle missing modifier?
    // wait, the strings are just '8:00', no AM/PM!
    // But implicitly:
    // 8:00 -> AM
    // 10:00 -> AM
    // 12:30 -> PM
    // 2:30 -> PM
    // 4:30 -> PM
    // 5:30 -> PM
    // 7:30 -> PM
    // 9:30 -> PM
    
    // So if hour is < 8, it's PM (e.g. 2, 4, 5, 7) -> add 12!
    // Except 12 is 12 PM.
    
    let [h, m] = timeStr.split(':').map(Number);
    if (h < 8) h += 12; // 2:30 -> 14:30, 4:30 -> 16:30, 7:30 -> 19:30
    // 8, 9, 10, 12 remain 8, 9, 10, 12
    return h * 60 + m; // minutes from midnight
};

for (const [meal, timeStr] of Object.entries(mealTimings)) {
    const [start, end] = timeStr.split(' - ').map(parseTime);
    console.log(`${meal}: ${start} to ${end}`);
}
