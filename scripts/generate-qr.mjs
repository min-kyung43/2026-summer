import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const BarcodeFormat = require('@zxing/library/cjs/core/BarcodeFormat.js').default
const EncodeHintType = require('@zxing/library/cjs/core/EncodeHintType.js').default
const QRCodeWriter = require('@zxing/library/cjs/core/qrcode/QRCodeWriter.js').default

const value = 'ARCHIVE-01-NEXT'
const outputPath = new URL('../public/qr/first-archive-qr.svg', import.meta.url)

const writer = new QRCodeWriter()
const hints = new Map()
hints.set(EncodeHintType.MARGIN, 1)

const matrix = writer.encode(value, BarcodeFormat.QR_CODE, 240, 240, hints)
const width = matrix.getWidth()
const height = matrix.getHeight()

let rects = ''

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (matrix.get(x, y)) {
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="#0f2140" />\n`
    }
  }
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">\n` +
  `  <rect width="100%" height="100%" fill="#eef4ff" />\n` +
  `  ${rects}` +
  `</svg>\n`

fs.writeFileSync(outputPath, svg)

console.log(`Wrote ${outputPath.pathname}`)
