import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

const extensionIcons = {
  '16': 'assets/img/extension-icons/icon-16.png',
  '32': 'assets/img/extension-icons/icon-32.png',
  '48': 'assets/img/extension-icons/icon-48.png',
  '128': 'assets/img/extension-icons/icon-128.png',
} as const

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: 'Work time, tasks, and Pomodoro breaks.',
  icons: extensionIcons,
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'orasometer',
    default_icon: extensionIcons,
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['storage', 'alarms', 'windows'],
})
