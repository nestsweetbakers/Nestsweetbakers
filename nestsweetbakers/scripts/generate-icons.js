const sharp = require('sharp');
const fs = require('fs');

// Create a simple colored square as placeholder
const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#ec4899"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="200" font-weight="bold" font-family="Arial">🍰</text>
</svg>
`;

async function generateIcons() {
  const buffer = Buffer.from(svg);
  
  // Generate 192x192
  await sharp(buffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192x192.png');
  
  // Generate 512x512
  await sharp(buffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512x512.png');
  
  // Generate apple-touch-icon
  await sharp(buffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  
  console.log('✅ Icons generated successfully!');
}

generateIcons();
