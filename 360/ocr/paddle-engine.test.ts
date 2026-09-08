import assert from 'node:assert/strict'
import {
  polyToNormalizedBox,
  ocrLineToNativeTextInsert,
  convertOcrLinesToNativeInserts,
  type PaddleOcrLine,
  type PaddleOcrPoint,
} from './paddle-engine.ts'

// Check polyToNormalizedBox
const poly: PaddleOcrPoint[] = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 300, y: 200 },
  { x: 100, y: 200 },
]
const box = polyToNormalizedBox(poly, 1000, 1000)
assert.deepStrictEqual(box, [0.1, 0.8, 0.3, 0.9])

// Check ocrLineToNativeTextInsert
const line: PaddleOcrLine = {
  text: 'VuaOffice Native PDF OCR',
  confidence: 0.98,
  box: [0.1, 0.8, 0.3, 0.9],
}
const insert = ocrLineToNativeTextInsert(line, 0, 612, 792)
assert.strictEqual(insert.pageIndex, 0)
assert.strictEqual(insert.text, 'VuaOffice Native PDF OCR')
assert.strictEqual(insert.origin[0], 61.2)
// origin y: y0 (633.6) + boxHeightPt * 0.15 (11.88) = 645.5
assert.strictEqual(insert.origin[1], 645.5)
assert.strictEqual(insert.fontSize, 63.4)

// Check filtering on confidence
const lowConfLine: PaddleOcrLine = {
  text: 'Noise',
  confidence: 0.2,
  box: [0, 0, 0.1, 0.1],
}
const inserts = convertOcrLinesToNativeInserts([line, lowConfLine], 0, 612, 792, 0, 0.35)
assert.strictEqual(inserts.length, 1)
assert.strictEqual(inserts[0].text, 'VuaOffice Native PDF OCR')

console.log('PaddleOCR offline engine self-check passed!')
