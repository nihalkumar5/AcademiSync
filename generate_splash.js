const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

registerFont('/System/Library/Fonts/Supplemental/Arial Bold.ttf', { family: 'AppFont', weight: 'bold' });
registerFont('/System/Library/Fonts/Supplemental/Arial.ttf', { family: 'AppFont', weight: 'normal' });

async function createSplash() {
  const width = 1440;
  const height = 3200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, 0, width, height);

  // Illustration
  const img = await loadImage('/Users/nihalkumar/Downloads/spin.png');
  const illWidth = 1120;
  const illHeight = illWidth * (img.height / img.width);
  const illX = (width - illWidth) / 2;
  const illY = (height - illHeight) / 2 + 80;
  ctx.drawImage(img, illX, illY, illWidth, illHeight);

  // Top Branding
  const titleY = height * 0.17;
  const fontSize = 135;

  ctx.font = `bold ${fontSize}px AppFont`;
  const interWidth = ctx.measureText('inter').width;

  ctx.font = `normal ${fontSize}px AppFont`;
  const semesterWidth = ctx.measureText('semester').width;

  const totalWidth = interWidth + semesterWidth;
  const startX = (width - totalWidth) / 2;

  // Draw "inter"
  ctx.font = `bold ${fontSize}px AppFont`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('inter', startX, titleY);

  // Draw "semester"
  ctx.font = `normal ${fontSize}px AppFont`;
  ctx.fillText('semester', startX + interWidth, titleY);

  // Tagline: "Plan better. Stay ahead."
  ctx.textAlign = 'center';
  ctx.font = 'normal 48px AppFont';
  ctx.fillStyle = '#6F6F6F';
  ctx.fillText('Plan better. Stay ahead.', width / 2, titleY + 110);

  // Bottom "Loading..."
  const bottomY = height * 0.88;
  ctx.font = 'normal 42px AppFont';
  ctx.fillStyle = '#9E9E9E';
  ctx.fillText('Loading...', width / 2, bottomY);

  // Save master splash
  const outPath = path.join(__dirname, 'master_splash.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log('Master splash updated at:', outPath);

  // Android drawables
  const resDir = path.join(__dirname, 'android/app/src/main/res');

  const densities = [
    { dir: 'drawable-port-mdpi', w: 480, h: 800 },
    { dir: 'drawable-port-hdpi', w: 800, h: 1280 },
    { dir: 'drawable-port-xhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-port-xxxhdpi', w: 1440, h: 2560 },
    { dir: 'drawable', w: 1280, h: 1920 },
  ];

  for (const d of densities) {
    const targetDir = path.join(resDir, d.dir);
    if (fs.existsSync(targetDir)) {
      const targetFile = path.join(targetDir, 'splash.png');
      execSync(`sips -z ${d.h} ${d.w} "${outPath}" --out "${targetFile}"`);
      console.log(`Updated ${d.dir}/splash.png (${d.w}x${d.h})`);
    }
  }

  // Also update landscape just in case
  const landDensities = [
    { dir: 'drawable-land-mdpi', w: 800, h: 480 },
    { dir: 'drawable-land-hdpi', w: 1280, h: 800 },
    { dir: 'drawable-land-xhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxhdpi', w: 1920, h: 1280 },
    { dir: 'drawable-land-xxxhdpi', w: 2560, h: 1440 },
  ];
  for (const d of landDensities) {
    const targetDir = path.join(resDir, d.dir);
    if (fs.existsSync(targetDir)) {
      const targetFile = path.join(targetDir, 'splash.png');
      execSync(`sips -z ${d.h} ${d.w} "${outPath}" --out "${targetFile}"`);
    }
  }
}

createSplash().catch(console.error);
