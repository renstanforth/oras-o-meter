import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

/** Shown in `chrome://extensions` where supported; keep in sync with your site & contact. */
const extensionListing = {
  homepageUrl: 'https://renstanforth.com/',
  /** Human-readable credit in the short description. */
  authorName: 'Ren Stanforth',
} as const

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
  description: `Work time, tasks, and Pomodoro breaks. By ${extensionListing.authorName}.`,
  homepage_url: extensionListing.homepageUrl,
  author: { email: extensionListing.authorName },
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
  permissions: ['storage', 'alarms'],
  web_accessible_resources: [
    {
      resources: [
        'assets/img/extension-icons/icon-16-dim.png',
        'assets/img/extension-icons/icon-32-dim.png',
        'assets/img/extension-icons/icon-48-dim.png',
        'assets/img/extension-icons/icon-128-dim.png',
      ],
      matches: ['<all_urls>'],
    },
  ],
})
