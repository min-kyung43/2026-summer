import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const BarcodeFormat = require('@zxing/library/cjs/core/BarcodeFormat.js').default
const EncodeHintType = require('@zxing/library/cjs/core/EncodeHintType.js').default
const QRCodeWriter = require('@zxing/library/cjs/core/qrcode/QRCodeWriter.js').default
const fakeQrBaseUrl = process.env.FAKE_QR_BASE_URL ?? 'https://2026-summer.vercel.app/'

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
const fakeOutputDirectory = new URL('../public/fake-qr/', import.meta.url)
const fakePrintDirectory = new URL('../Fake-QR/', import.meta.url)
fs.mkdirSync(outputDirectory, { recursive: true })
fs.mkdirSync(fakeOutputDirectory, { recursive: true })
fs.mkdirSync(fakePrintDirectory, { recursive: true })

const writer = new QRCodeWriter()
const hints = new Map()
hints.set(EncodeHintType.MARGIN, 1)

function createQrSvg(value, label) {
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

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="${label} QR">\n` +
    `  <title>${label}</title>\n` +
    `  <desc>${value}</desc>\n` +
    `  <rect width="100%" height="100%" fill="#eef4ff" />\n` +
    `  ${rects}` +
    `</svg>\n`
}

for (const qrCode of qrCodes) {
  const svg = createQrSvg(qrCode.value, `ARCHIVE #${qrCode.id} ${qrCode.place}`)

  const outputPath = new URL(qrCode.filename, outputDirectory)
  fs.writeFileSync(outputPath, svg)

  console.log(`Wrote ${decodeURIComponent(outputPath.pathname)} (${qrCode.place}: ${qrCode.value})`)
}

for (let index = 1; index <= 10; index += 1) {
  const id = String(index).padStart(2, '0')
  const value = new URL(`?fakeQr=${id}`, fakeQrBaseUrl).toString()
  const filename = `fake-qr-${id}.svg`
  const svg = createQrSvg(value, `FAKE QR #${id}`)

  const publicOutputPath = new URL(filename, fakeOutputDirectory)
  const printOutputPath = new URL(filename, fakePrintDirectory)

  fs.writeFileSync(publicOutputPath, svg)
  fs.writeFileSync(printOutputPath, svg)

  console.log(`Wrote ${decodeURIComponent(publicOutputPath.pathname)} (${value})`)
  console.log(`Wrote ${decodeURIComponent(printOutputPath.pathname)} (${value})`)
}
