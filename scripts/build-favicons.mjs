import sharp from 'sharp'
import toIco from 'to-ico'
import fs from 'fs'
import path from 'path'

// Exact brand icon matching the provided Malshi Suppliers badge:
// Orange-amber linear gradient background with rounded rectangle (squircle)
// and centered white cilTruck silhouette.
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mgBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
  </defs>
  <!-- Rounded Orange Square / Squircle (matching .mg-brand-badge) -->
  <rect width="512" height="512" rx="115" ry="115" fill="url(#mgBrandGrad)" />
  <!-- White Truck Icon (cilTruck scaled & centered) -->
  <g transform="translate(256, 256) scale(0.62) translate(-256, -258)">
    <path fill="#ffffff" d="M441.885 141.649A32.03 32.03 0 0 0 415.669 128H336V80a32.036 32.036 0 0 0-32-32H48a32.036 32.036 0 0 0-32 32v328h53.082a67.982 67.982 0 0 0 133.836 0h106.164a67.982 67.982 0 0 0 133.836 0H496V226.522a23.9 23.9 0 0 0-4.338-13.763ZM47.98 80H304v176H48ZM136 432a36 36 0 1 1 36-36 36.04 36.04 0 0 1-36 36m240 0a36 36 0 1 1 36-36 36.04 36.04 0 0 1-36 36m88-56h-23.006a68 68 0 0 0-129.988 0H200.994a68 68 0 0 0-129.988 0H48v-88h416Zm0-120H336v-96h79.669L464 229.044Z" />
  </g>
</svg>`

async function main() {
  const publicDir = path.resolve('public')
  const svgBuffer = Buffer.from(svgContent)

  const sizes = [16, 32, 48, 64, 180, 192, 512]
  const pngBuffers = {}

  for (const size of sizes) {
    pngBuffers[size] = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer()
    console.log(`Generated ${size}x${size} PNG (${pngBuffers[size].length} bytes)`)
  }

  // Multi-resolution ICO for Google Search and browsers (16, 32, 48)
  const icoBuffer = await toIco([pngBuffers[16], pngBuffers[32], pngBuffers[48]])
  console.log(`Generated favicon.ico (${icoBuffer.length} bytes)`)

  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8')
  // Save ICO
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer)
  // Save PNGs
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), pngBuffers[16])
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), pngBuffers[32])
  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), pngBuffers[48])
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffers[180])
  fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), pngBuffers[192])
  fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), pngBuffers[512])
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), pngBuffers[512])

  // Also update src/assets/images/orange-lorry.svg or brand logo
  const imagesDir = path.resolve('src/assets/images')
  if (fs.existsSync(imagesDir)) {
    fs.writeFileSync(path.join(imagesDir, 'brand-icon.svg'), svgContent, 'utf8')
    fs.writeFileSync(path.join(imagesDir, 'brand-icon.png'), pngBuffers[512])
  }

  console.log('Successfully written all assets.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
