/**
 * 360 CORP — VuaOffice Screenshots: data model of the annotation editor.
 * Pure types/constants: shared by the shell main process, the renderer and tests.
 */

export type CaptureMode = 'area' | 'window' | 'fullscreen'

export type Tool = 'arrow' | 'rect' | 'ellipse' | 'line' | 'pen' | 'marker' | 'text' | 'step' | 'blur'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** One committed annotation. Document data: colors stay literal in every theme. */
export type Shape =
  | { tool: 'arrow' | 'line'; color: string; width: number; from: Point; to: Point }
  | { tool: 'rect' | 'ellipse' | 'blur'; color: string; width: number; rect: Rect }
  | { tool: 'pen' | 'marker'; color: string; width: number; points: Point[] }
  | { tool: 'text'; color: string; width: number; at: Point; text: string; size: number }
  | { tool: 'step'; color: string; width: number; at: Point; n: number }

/** Annotation palette (document content, not UI chrome — stays hardcoded per CLAUDE.md §4). */
export const PALETTE = [
  '#e03131', // red
  '#f08c00', // orange
  '#fcc419', // yellow
  '#2f9e44', // green
  '#0077cd', // 360 blue
  '#7048e8', // violet
  '#ffffff', // white
  '#1a1a1a', // black
] as const

export const STROKES = [2, 4, 8] as const

export const DEFAULT_COLOR = PALETTE[0]
export const DEFAULT_STROKE = STROKES[1]
