// Simple icon generator using SVG -> data URL approach
// Creates PNG icons from an SVG template
import { writeFileSync, mkdirSync } from 'fs';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateSVG(size) {
  const padding = Math.round(size * 0.15);
  const innerSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = innerSize / 2;

  // Simple flower/fertility symbol icon
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#4CAF50"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="white" opacity="0.95"/>
  ${[0, 60, 120, 180, 240, 300].map(angle => {
    const rad = (angle * Math.PI) / 180;
    const px = cx + Math.cos(rad) * r * 0.35;
    const py = cy + Math.sin(rad) * r * 0.35;
    return `<circle cx="${px}" cy="${py}" r="${r * 0.22}" fill="white" opacity="0.7"/>`;
  }).join('\n  ')}
  <text x="${cx}" y="${cy + r * 0.12}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${r * 0.45}" font-weight="bold" fill="#4CAF50">C</text>
</svg>`;
}

function generateMaskableSVG(size) {
  // Maskable icons need safe zone (inner 80%)
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.28;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#4CAF50"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="white" opacity="0.95"/>
  ${[0, 60, 120, 180, 240, 300].map(angle => {
    const rad = (angle * Math.PI) / 180;
    const px = cx + Math.cos(rad) * r;
    const py = cy + Math.sin(rad) * r;
    return `<circle cx="${px}" cy="${py}" r="${r * 0.6}" fill="white" opacity="0.7"/>`;
  }).join('\n  ')}
  <text x="${cx}" y="${cy + r * 0.25}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${r * 1.1}" font-weight="bold" fill="#4CAF50">C</text>
</svg>`;
}

mkdirSync('public/icons', { recursive: true });

for (const size of sizes) {
  const svg = generateSVG(size);
  writeFileSync(`public/icons/icon-${size}x${size}.svg`, svg);
  console.log(`Generated icon-${size}x${size}.svg`);
}

// Maskable
const maskableSvg = generateMaskableSVG(512);
writeFileSync('public/icons/maskable-icon-512x512.svg', maskableSvg);
console.log('Generated maskable-icon-512x512.svg');

console.log('\nNote: SVG icons generated. For production, convert to PNG using a tool like sharp or Inkscape.');
console.log('The PWA manifest references PNG files. For development, we will update the manifest to use SVG.');
