const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function processFinalSplash() {
  const srcPath = '/Users/nihalkumar/Downloads/splash_final.png';
  const img = await loadImage(srcPath);

  // Create clean master on #FFFFFF background
  const width = img.width;
  const height = img.height;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const masterPath = path.join(__dirname, 'master_splash_final.png');
  fs.writeFileSync(masterPath, canvas.toBuffer('image/png'));
  console.log(`Saved master splash on white background (${width}x${height})`);

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
      execSync(`sips -z ${d.h} ${d.w} "${masterPath}" --out "${targetFile}"`);
      console.log(`Updated ${d.dir}/splash.png (${d.w}x${d.h})`);
    }
  }

  // Also update ic_splash_logo.png
  const icPath = path.join(resDir, 'drawable/ic_splash_logo.png');
  execSync(`sips -z 1024 1024 "${masterPath}" --out "${icPath}"`);

  // Landscape densities
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
      execSync(`sips -z ${d.h} ${d.w} "${masterPath}" --out "${targetFile}"`);
    }
  }

  console.log('All drawables updated successfully with splash_final.png!');
}

processFinalSplash().catch(console.error);
