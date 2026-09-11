#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const cargoArgs = [
  'build',
  '--release',
  '--manifest-path',
  'native/xlsx-engine/Cargo.toml',
  '--config',
  'native/xlsx-engine/.cargo/config.toml',
  '--bin',
  'xlsx-sidecar',
]
const targetIndex = process.argv.indexOf('--target')
const cliTarget = targetIndex === -1 ? '' : process.argv[targetIndex + 1]
if (targetIndex !== -1 && !cliTarget) throw new Error('Missing value for --target')

const target =
  cliTarget ||
  process.env.XLSX_SIDECAR_TARGET ||
  (process.platform === 'win32'
    ? process.arch === 'ia32'
      ? 'i686-pc-windows-msvc'
      : 'x86_64-pc-windows-msvc'
    : '')

if (process.platform === 'win32' && !target) {
  throw new Error('Windows sidecar builds require an explicit target triple')
}

if (process.platform === 'darwin' && !target) {
  console.log('[sidecar] Building universal binary for macOS...')
  for (const appleTarget of ['x86_64-apple-darwin', 'aarch64-apple-darwin']) {
    execFileSync('cargo', [...cargoArgs, '--target', appleTarget], { stdio: 'inherit' })
  }
  mkdirSync('native/xlsx-engine/target/release', { recursive: true })
  execFileSync(
    'lipo',
    [
      '-create',
      'native/xlsx-engine/target/x86_64-apple-darwin/release/xlsx-sidecar',
      'native/xlsx-engine/target/aarch64-apple-darwin/release/xlsx-sidecar',
      '-output',
      'native/xlsx-engine/target/release/xlsx-sidecar',
    ],
    { stdio: 'inherit' },
  )
} else {
  execFileSync('cargo', [...cargoArgs, ...(target ? ['--target', target] : [])], {
    stdio: 'inherit',
  })
  if (target.endsWith('-pc-windows-msvc')) {
    const outputName = 'xlsx-sidecar.exe'
    const targetOutput = join('native/xlsx-engine/target', target, 'release', outputName)
    const packagingOutput = join('native/xlsx-engine/target/release', outputName)
    mkdirSync('native/xlsx-engine/target/release', { recursive: true })
    copyFileSync(targetOutput, packagingOutput)
    chmodSync(packagingOutput, 0o755)
  }
}

if (target.endsWith('-pc-windows-msvc')) {
  console.log(`[sidecar] Packaging ${target} as native/xlsx-engine/target/release/xlsx-sidecar.exe`)
}
