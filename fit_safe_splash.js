const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

registerFont('/System/Library/Fonts/Supplemental/Arial Bold.ttf', { family: 'AppFont', weight: 'bold' });
registerFont('/System/Library/Fonts/Supplemental/Arial.ttf', { family: 'AppFont', weight: 'normal' });

async function createSafeSplash() {
  const size = 1152;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background pure white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Load logo
  const logoImg = await loadImage(path.join(__dirname, 'public/logo1.png'));

  // Center coordinate: (576, 576)
  // Inner safe circle diameter: 720px (radius 360)
  
  // Icon dimensions
  const iconSize = 340;
  const iconX = (size - iconSize) / 2;
  const iconY = 360;

  ctx.drawImage(logoImg, iconX, iconY, iconSize, iconSize);

  // Text dimensions: 54px font gives ~460px total width
  const fontSize = 54;
  const textY = iconY + iconSize + 75;

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
  ctx.fillText('inter', startX, textY);

  // "semester" (regular)
  ctx.font = `normal ${fontSize}px AppFont`;
  ctx.fillText('semester', startX + interWidth, textY);

  // Save ic_splash_logo.png
  const resDir = path.join(__dirname, 'android/app/src/main/res');
  const icPath = path.join(resDir, 'drawable/ic_splash_logo.png');
  fs.writeFileSync(icPath, canvas.toBuffer('image/png'));
  console.log('Saved safe ic_splash_logo.png');

  // Full screen splash for other densities
  const fullCanvas = createCanvas(1440, 2560);
  const fullCtx = fullCanvas.getContext('2d');
  fullCtx.fillStyle = '#FFFFFF';
  fullCtx.fillRect(0, 0, 1440, 2560);
  fullCtx.drawImage(canvas, (1440 - size) / 2, (2560 - size) / 2);

  const masterOut = path.join(__dirname, 'master_icon_splash.png');
  fs.writeFileSync(masterOut, fullCanvas.toBuffer('image/png'));

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

  // Create a debug preview with the red Android 12 circle mask drawn over it to verify 0 cut
  const debugCanvas = createCanvas(size, size);
  const debugCtx = debugCanvas.getContext('2d');
  debugCtx.drawImage(canvas, 0, 0);
  debugCtx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
  debugCtx.lineWidth = 4;
  debugCtx.beginPath();
  debugCtx.arc(576, 576, 360, 0, Math.PI * 2);
  debugCtx.stroke();
  fs.writeFileSync(path.join(__dirname, 'circle_debug_preview.png'), debugCanvas.toBuffer('image/png'));
  console.log('Circle debug preview generated!');
}

createSafeSplash().catch(console.error);
