const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

registerFont('/System/Library/Fonts/Supplemental/Arial Bold.ttf', { family: 'AppFont', weight: 'bold' });
registerFont('/System/Library/Fonts/Supplemental/Arial.ttf', { family: 'AppFont', weight: 'normal' });

async function createIconTextSplash() {
  const size = 1152;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Clear background (white/transparent)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Load logo1.png
  const logoImg = await loadImage(path.join(__dirname, 'public/logo1.png'));

  // 1. Draw "is" icon in center-upper area
  const iconSize = 440;
  const iconX = (size - iconSize) / 2;
  const iconY = (size / 2) - 280;

  ctx.drawImage(logoImg, iconX, iconY, iconSize, iconSize);

  // 2. Draw "intersemester" text below the icon
  const titleY = iconY + iconSize + 110;
  const fontSize = 86;

  ctx.font = `bold ${fontSize}px AppFont`;
  const interWidth = ctx.measureText('inter').width;

  ctx.font = `normal ${fontSize}px AppFont`;
  const semesterWidth = ctx.measureText('semester').width;

  const totalWidth = interWidth + semesterWidth;
  const startX = (size - totalWidth) / 2;

  // "inter" (bold)
  ctx.font = `bold ${fontSize}px AppFont`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('inter', startX, titleY);

  // "semester" (regular)
  ctx.font = `normal ${fontSize}px AppFont`;
  ctx.fillText('semester', startX + interWidth, titleY);

  // Save to ic_splash_logo.png
  const resDir = path.join(__dirname, 'android/app/src/main/res');
  const icPath = path.join(resDir, 'drawable/ic_splash_logo.png');
  fs.writeFileSync(icPath, canvas.toBuffer('image/png'));
  console.log('Saved ic_splash_logo.png');

  // Also save to full splash.png across all densities
  const fullSplashCanvas = createCanvas(1440, 2560);
  const fullCtx = fullSplashCanvas.getContext('2d');
  fullCtx.fillStyle = '#FFFFFF';
  fullCtx.fillRect(0, 0, 1440, 2560);
  
  // Draw the icon + text centered vertically
  const fullY = (2560 - size) / 2;
  const fullX = (1440 - size) / 2;
  fullCtx.drawImage(canvas, fullX, fullY);

  const masterOut = path.join(__dirname, 'master_icon_splash.png');
  fs.writeFileSync(masterOut, fullSplashCanvas.toBuffer('image/png'));

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
      execSync(`sips -z ${d.h} ${d.w} "${masterOut}" --out "${targetFile}"`);
    }
  }
  console.log('All drawables updated with Icon + Text Splash!');
}

createIconTextSplash().catch(console.error);
