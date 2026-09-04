import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Pin resolution to this repo's workspace sources (matches tsconfig paths)
  resolve: {
    alias: {
      // Subpath before the bare name: string aliases are prefix replacements
      '@genoffice/pptx-engine/table-grid': resolve(
        here,
        '../../packages/pptx-engine/src/table-grid.ts',
      ),
      '@genoffice/pptx-engine/identity': resolve(
        here,
        '../../packages/pptx-engine/src/identity.ts',
      ),
      '@genoffice/pptx-engine/background-promote': resolve(
        here,
        '../../packages/pptx-engine/src/background-promote.ts',
      ),
      '@genoffice/pptx-engine/custgeom': resolve(
        here,
        '../../packages/pptx-engine/src/custgeom.ts',
      ),
      '@genoffice/pptx-engine': resolve(here, '../../packages/pptx-engine/src/index.ts'),
      '@genoffice/pptx-render/preset-geometry': resolve(
        here,
        '../../packages/pptx-render/src/preset-geometry.ts',
      ),
      '@genoffice/pptx-render': resolve(here, '../../packages/pptx-render/src/index.ts'),
      '@genoffice/docx-engine/metafile': resolve(
        here,
        '../../packages/docx-engine/src/metafile.ts',
      ),
      '@genoffice/ui/fonts': resolve(here, '../../packages/ui/src/fonts'),
    },
  },
  plugins: [
    {
      name: 'asset-query-resolver',
      enforce: 'pre',
      resolveId(source) {
        if (source.endsWith('?asset')) {
          const clean = source.slice(0, -6)
          return this.resolve(clean).then((resolved) => (resolved ? `${resolved.id}?asset` : null))
        }
        return null
      },
      load(id) {
        if (id.includes('?asset')) {
          const filePath = id.replace(/\?asset.*$/, '').replace(/^\/@fs/, '')
          return `export default ${JSON.stringify(filePath)}`
        }
        return null
      },
    },
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
  },
})
