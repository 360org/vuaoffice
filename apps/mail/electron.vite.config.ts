import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const localAlias = {
  '@genoffice/mail-engine': resolve(__dirname, '../../packages/mail-engine/src/index.ts'),
  '@genoffice/mail-engine/eml': resolve(__dirname, '../../packages/mail-engine/src/eml/index.ts'),
  '@genoffice/mail-engine/pst': resolve(__dirname, '../../packages/mail-engine/src/pst/index.ts'),
  '@genoffice/mail-engine/threading': resolve(__dirname, '../../packages/mail-engine/src/threading/index.ts'),
  '@genoffice/mail-engine/rules': resolve(__dirname, '../../packages/mail-engine/src/rules/index.ts'),
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@genoffice/i18n', '@genoffice/electron-utils', '@genoffice/ai-provider'],
      }),
    ],
    resolve: { alias: localAlias },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@genoffice/i18n'] })],
    resolve: { alias: localAlias },
  },
  renderer: {
    plugins: [react()],
    resolve: { alias: localAlias },
    server: {
      port: Number(process.env.MAIL_DEV_PORT) || 5179,
      strictPort: Boolean(process.env.MAIL_DEV_PORT),
    },
  },
})
