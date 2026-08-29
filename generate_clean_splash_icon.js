const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

registerFont('/System/Library/Fonts/Supplemental/Arial Bold.ttf', { family: 'AppFont', weight: 'bold' });
registerFont('/System/Library/Fonts/Supplemental/Arial.ttf', { family: 'AppFont', weight: 'normal' });

async function createSharpSplash() {
  const size = 1152;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Load spin.png
  const img = await loadImage('/Users/nihalkumar/Downloads/spin.png');

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  // 1. Text branding at top
  const titleY = 160;
  const fontSize = 72;

  ctx.font = `bold ${fontSize}px AppFont`;
  const interWidth = ctx.measureText('inter').width;

  ctx.font = `normal ${fontSize}px AppFont`;
  const semesterWidth = ctx.measureText('semester').width;

  const totalWidth = interWidth + semesterWidth;
  const startX = (size - totalWidth) / 2;

  // Draw "inter"
  ctx.font = `bold ${fontSize}px AppFont`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('inter', startX, titleY);

  // Draw "semester"
  ctx.font = `normal ${fontSize}px AppFont`;
  ctx.fillText('semester', startX + interWidth, titleY);

  // Tagline
  ctx.textAlign = 'center';
  ctx.font = 'normal 26px AppFont';
  ctx.fillStyle = '#6F6F6F';
  ctx.fillText('Plan better. Stay ahead.', size / 2, titleY + 55);

  // 2. Illustration
  const illW = 680;
  const illH = illW * (img.height / img.width);
  const illX = (size - illW) / 2;
  const illY = 270;

  ctx.drawImage(img, illX, illY, illW, illH);

  // Save to ic_splash_logo.png
  const outPath = path.join(__dirname, 'android/app/src/main/res/drawable/ic_splash_logo.png');
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log('Saved high-res splash logo (1152x1152) to:', outPath);
}

createSharpSplash().catch(console.error);
