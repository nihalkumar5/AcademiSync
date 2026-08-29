const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

registerFont('/System/Library/Fonts/Supplemental/Arial Bold.ttf', { family: 'AppFont', weight: 'bold' });
registerFont('/System/Library/Fonts/Supplemental/Arial.ttf', { family: 'AppFont', weight: 'normal' });

async function createAdaptiveSplash() {
  // Android 12 SplashScreen icon standard: 1024 x 1024 square
  // The safe circular viewport is 680px diameter in the center
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent or match #FAFAF8 background so circle has NO borders
  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, 0, size, size);

  // Load illustration
  const img = await loadImage('/Users/nihalkumar/Downloads/spin.png');

  // Let's position everything so it fits comfortably within the 680px inner circle
  // Circle center: (512, 512), radius: 340px
  
  // 1. Top Logo: "inter" (bold) + "semester" (regular)
  const titleY = 220;
  const fontSize = 54;

  ctx.font = `bold ${fontSize}px AppFont`;
  const interWidth = ctx.measureText('inter').width;

  ctx.font = `normal ${fontSize}px AppFont`;
  const semesterWidth = ctx.measureText('semester').width;

  const totalWidth = interWidth + semesterWidth;
  const startX = (size - totalWidth) / 2;

  ctx.font = `bold ${fontSize}px AppFont`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('inter', startX, titleY);

  ctx.font = `normal ${fontSize}px AppFont`;
  ctx.fillText('semester', startX + interWidth, titleY);

  // 2. Tagline
  ctx.textAlign = 'center';
  ctx.font = 'normal 22px AppFont';
  ctx.fillStyle = '#6F6F6F';
  ctx.fillText('Plan better. Stay ahead.', size / 2, titleY + 45);

  // 3. Illustration in center
  const illWidth = 460;
  const illHeight = illWidth * (img.height / img.width);
  const illX = (size - illWidth) / 2;
  const illY = 320;
  ctx.drawImage(img, illX, illY, illWidth, illHeight);

  // Save as ic_splash_logo.png
  const outPath = path.join(__dirname, 'android/app/src/main/res/drawable/ic_splash_logo.png');
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log('Saved adaptive splash icon to:', outPath);
}

createAdaptiveSplash().catch(console.error);
