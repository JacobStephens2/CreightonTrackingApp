import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = 'public/app-icons';

function generateSVG(size, { maskable = false } = {}) {
  const radius = maskable ? 0 : Math.round(size * 0.2);
  const center = size / 2;
  const markRadius = size * (maskable ? 0.25 : 0.24);
  const stroke = size * (maskable ? 0.09 : 0.085);
  const dotRadius = size * 0.06;
  const accentRadius = size * 0.17;
  const accentX = size * 0.74;
  const accentY = size * 0.3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8d6466"/>
      <stop offset="100%" stop-color="#6b4747"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#f7c5c5" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#f7c5c5" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <circle cx="${size * 0.28}" cy="${size * 0.22}" r="${size * 0.34}" fill="url(#glow)" opacity="0.55"/>
  <circle cx="${center}" cy="${center}" r="${size * 0.3}" fill="#fff7f6" opacity="0.14"/>
  <circle cx="${accentX}" cy="${accentY}" r="${accentRadius}" fill="#f7c5c5" opacity="0.22"/>
  <path d="M ${center + markRadius * 0.75} ${center - markRadius * 0.95}
           A ${markRadius} ${markRadius} 0 1 0 ${center + markRadius * 0.75} ${center + markRadius * 0.95}"
        fill="none"
        stroke="#fff7f6"
        stroke-width="${stroke}"
        stroke-linecap="round"/>
  <circle cx="${center + markRadius * 0.9}" cy="${center - markRadius * 0.65}" r="${dotRadius}" fill="#daf8e8"/>
</svg>`;
}

function writeSVG(path, svg) {
  writeFileSync(path, svg);
  console.log(`Generated ${path}`);
}

function writePNG(svgPath, pngPath, size) {
  execFileSync('convert', [
    '-background',
    'none',
    '-resize',
    `${size}x${size}`,
    svgPath,
    pngPath,
  ]);
  console.log(`Generated ${pngPath}`);
}

mkdirSync(outputDir, { recursive: true });

for (const size of sizes) {
  const svgPath = `${outputDir}/icon-${size}x${size}.svg`;
  const pngPath = `${outputDir}/icon-${size}x${size}.png`;
  const svg = generateSVG(size);
  writeSVG(svgPath, svg);
  writePNG(svgPath, pngPath, size);
}

const maskableSvgPath = `${outputDir}/maskable-icon-512x512.svg`;
const maskablePngPath = `${outputDir}/maskable-icon-512x512.png`;
writeSVG(maskableSvgPath, generateSVG(512, { maskable: true }));
writePNG(maskableSvgPath, maskablePngPath, 512);

const faviconSvgPath = 'public/favicon.svg';
writeSVG(faviconSvgPath, generateSVG(64));

console.log('Updated app icons and favicon.');
