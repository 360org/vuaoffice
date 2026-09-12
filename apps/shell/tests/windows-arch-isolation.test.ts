import { describe, expect, it } from 'vitest'
import { Arch, archFromString } from 'builder-util'
import { computeArchToTargetNamesMap } from 'app-builder-lib/out/targets/targetFactory.js'
import config from '../electron-builder.cjs'

/**
 * Regression guard for the v1.0.38 Windows x64 release failure.
 *
 * computeArchToTargetNamesMap() only falls back to the CLI-selected arch when a
 * target omits `arch`. Declaring `arch: ['x64', 'ia32']` made `--win --x64`
 * queue an ia32 pass too, whose 32-bit sidecar the job never cross-compiled, so
 * the extraResources guard threw and the job exited 1 — while the x86 job
 * passed because its XLSX_SIDECAR_TARGET happened to satisfy that guard.
 */
function archesFor(cliArch: string, target: unknown): string[] {
  const raw = new Map([[archFromString(cliArch), [] as string[]]])
  const packager = {
    platformSpecificBuildOptions: { target },
    defaultTarget: ['nsis'],
  } as never
  const resolved = computeArchToTargetNamesMap(raw, packager, { name: 'windows' } as never)
  return [...resolved.keys()].map((a) => Arch[a]).sort()
}

describe('windows packaging arch isolation', () => {
  it('packages only the arch the release job asked for', () => {
    expect(archesFor('x64', config.win!.target)).toEqual(['x64'])
    expect(archesFor('ia32', config.win!.target)).toEqual(['ia32'])
  })

  it('documents why win.target must not declare its own arch', () => {
    // The shape that broke v1.0.38 — kept here so a future edit reintroducing
    // it fails this test instead of a 6-minute CI job.
    expect(archesFor('x64', [{ target: 'nsis', arch: ['x64', 'ia32'] }])).toContain('ia32')
  })
})
