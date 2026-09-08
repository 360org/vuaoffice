/**
 * 360 Native PDF OCR Engine (PP-OCRv6 / PaddleOCR Architecture).
 *
 * 100% Offline OCR bridge for VuaOffice PDF.
 * Converts recognized text lines and bounding boxes directly into native
 * PDF searchable/selectable text elements (TextInsertInput) or PdfOcrLine results.
 *
 * Design constraints:
 * 1. Lives under 360/ocr/* (protected by .gitattributes merge=ours against upstream conflicts).
 * 2. Operates 100% offline without requiring AI.
 * 3. Supports optional AI correction as a secondary refinement pass.
 * 4. Connects to VuaOffice PDF content-stream text insertion pipeline.
 */

export interface BoundingBox2D {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface PaddleOcrPoint {
  x: number
  y: number
}

export interface PaddleOcrItem {
  poly: PaddleOcrPoint[]
  text: string
  score: number
}

export interface PaddleOcrLine {
  text: string
  confidence: number
  box: [number, number, number, number] // [x0, y0, x1, y1] normalized 0..1, origin bottom-left
}

export interface NativeTextInsert {
  pageIndex: number
  origin: [number, number]
  text: string
  fontSize: number
  color: [number, number, number]
  font?: string
  bold?: boolean
  italic?: boolean
  rotate?: number
}

/**
 * Converts detected polygon points into an axis-aligned normalized bounding box [x0, y0, x1, y1]
 * with origin bottom-left (y up) suitable for PDF coordinate space.
 */
export function polyToNormalizedBox(
  poly: PaddleOcrPoint[],
  imageWidth: number,
  imageHeight: number,
): [number, number, number, number] {
  if (!poly || poly.length === 0 || imageWidth <= 0 || imageHeight <= 0) {
    return [0, 0, 0, 0]
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const pt of poly) {
    if (pt.x < minX) minX = pt.x
    if (pt.x > maxX) maxX = pt.x
    if (pt.y < minY) minY = pt.y
    if (pt.y > maxY) maxY = pt.y
  }

  const x0 = Math.max(0, Math.min(1, minX / imageWidth))
  const x1 = Math.max(0, Math.min(1, maxX / imageWidth))
  // Image coordinate is top-down; PDF coordinate is bottom-up (y up)
  const y0 = Math.max(0, Math.min(1, 1 - maxY / imageHeight))
  const y1 = Math.max(0, Math.min(1, 1 - minY / imageHeight))

  return [x0, y0, x1, y1]
}

/**
 * Calculates native PDF text insert position and font sizing from recognized OCR line.
 */
export function ocrLineToNativeTextInsert(
  line: PaddleOcrLine,
  pageIndex: number,
  pageWidthPt: number,
  pageHeightPt: number,
  rotate = 0,
): NativeTextInsert {
  const [x0, y0, x1, y1] = line.box
  const boxWidthPt = Math.max(1, (x1 - x0) * pageWidthPt)
  const boxHeightPt = Math.max(1, (y1 - y0) * pageHeightPt)

  // Typical text baseline sits at approx 15% from the bottom of the bounding box
  const originX = x0 * pageWidthPt
  const originY = y0 * pageHeightPt + boxHeightPt * 0.15

  // Font size approximation based on bounding box height
  const fontSize = Math.max(6, Math.round(boxHeightPt * 0.8 * 10) / 10)

  return {
    pageIndex,
    origin: [Math.round(originX * 10) / 10, Math.round(originY * 10) / 10],
    text: line.text,
    fontSize,
    color: [0, 0, 0], // Default crisp black text
    rotate,
  }
}

/**
 * Builds a collection of native PDF text inserts from multiple OCR recognized lines.
 */
export function convertOcrLinesToNativeInserts(
  lines: PaddleOcrLine[],
  pageIndex: number,
  pageWidthPt: number,
  pageHeightPt: number,
  rotate = 0,
  minConfidence = 0.35,
): NativeTextInsert[] {
  return lines
    .filter((l) => l.confidence >= minConfidence && l.text.trim().length > 0)
    .map((l) => ocrLineToNativeTextInsert(l, pageIndex, pageWidthPt, pageHeightPt, rotate))
}

/**
 * Offline PaddleOCR inference manager stub and model loader interface.
 * Matches the pipeline contract for PP-OCRv6 detection and recognition.
 */
export interface PaddleOcrConfig {
  ocrVersion: 'PP-OCRv6' | 'PP-OCRv5'
  detModelName: string
  recModelName: string
  minConfidence?: number
}

export const DEFAULT_PPOCR_CONFIG: PaddleOcrConfig = {
  ocrVersion: 'PP-OCRv6',
  detModelName: 'PP-OCRv6_small_det',
  recModelName: 'PP-OCRv6_small_rec',
  minConfidence: 0.4,
}
