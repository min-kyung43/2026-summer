import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const BarcodeFormat = require('@zxing/library/cjs/core/BarcodeFormat.js').default
const EncodeHintType = require('@zxing/library/cjs/core/EncodeHintType.js').default
const QRCodeWriter = require('@zxing/library/cjs/core/qrcode/QRCodeWriter.js').default

const qrCodes = [
  { id: '01', place: '본당', value: 'ARCHIVE-01-NEXT', filename: 'archive-01-main-hall.svg' },
  { id: '02', place: '수영장', value: 'ARCHIVE-02-NEXT', filename: 'archive-02-pool.svg' },
  { id: '03', place: '식당', value: 'ARCHIVE-03-NEXT', filename: 'archive-03-dining-room.svg' },
  { id: '04', place: '소예배실', value: 'ARCHIVE-04-NEXT', filename: 'archive-04-small-chapel.svg' },
  { id: '05', place: '2층 복도', value: 'ARCHIVE-05-NEXT', filename: 'archive-05-second-floor-hallway.svg' },
  { id: '06', place: '3층', value: 'ARCHIVE-06-NEXT', filename: 'archive-06-third-floor.svg' },
  { id: '07', place: '야외캠핑장', value: 'ARCHIVE-07-NEXT', filename: 'archive-07-outdoor-camp.svg' },
]

const outputDirectory = new URL('../public/qr/', import.meta.url)
fs.mkdirSync(outputDirectory, { recursive: true })

const writer = new QRCodeWriter()
const hints = new Map()
hints.set(EncodeHintType.MARGIN, 1)

for (const qrCode of qrCodes) {
  const matrix = writer.encode(qrCode.value, BarcodeFormat.QR_CODE, 240, 240, hints)
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="ARCHIVE #${qrCode.id} ${qrCode.place} QR">\n` +
    `  <title>ARCHIVE #${qrCode.id} ${qrCode.place}</title>\n` +
    `  <desc>${qrCode.value}</desc>\n` +
    `  <rect width="100%" height="100%" fill="#eef4ff" />\n` +
    `  ${rects}` +
    `</svg>\n`

  const outputPath = new URL(qrCode.filename, outputDirectory)
  fs.writeFileSync(outputPath, svg)

  console.log(`Wrote ${decodeURIComponent(outputPath.pathname)} (${qrCode.place}: ${qrCode.value})`)
}
