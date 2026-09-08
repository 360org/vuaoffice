import {
  convertOcrLinesToNativeInserts,
  type PaddleOcrLine,
  type NativeTextInsert,
} from '../../../../360/ocr/paddle-engine'
import type { LocalTextInsert } from './text-edit-preview'

export { convertOcrLinesToNativeInserts }
export type { PaddleOcrLine, NativeTextInsert }

export function ocrLinesToLocalTextInserts(
  lines: PaddleOcrLine[],
  pageIndex: number,
  pageWidthPt: number,
  pageHeightPt: number,
  rotate = 0,
  minConfidence = 0.35,
): LocalTextInsert[] {
  const inserts = convertOcrLinesToNativeInserts(
    lines,
    pageIndex,
    pageWidthPt,
    pageHeightPt,
    rotate,
    minConfidence,
  )
  return inserts.map((input) => ({
    id: `ocr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    input,
  }))
}
