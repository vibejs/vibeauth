import { defineConfig } from 'vitepress';
export default defineConfig({
  title: 'VibeAuth',
  description: 'Authentication, Native to vibe.js',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    search: { provider: 'local' },
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api' },
      { text: 'Security', link: '/security' },
    ],
    sidebar: [
      {
        text: 'Start',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation & quick start', link: '/getting-started' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Configuration', link: '/configuration' },
        ],
      },
      {
        text: 'Client & server',
        items: [
          { text: 'Client & composables', link: '/client' },
          { text: 'Server & guards', link: '/server' },
          { text: 'Router', link: '/router' },
          { text: 'Typed contracts', link: '/contracts' },
        ],
      },
      {
        text: 'Authentication',
        items: [
          { text: 'Email & password', link: '/email-password' },
          { text: 'Social providers', link: '/social' },
          { text: 'Sessions', link: '/sessions' },
          { text: 'Two-factor authentication', link: '/two-factor' },
          { text: 'Passkeys', link: '/passkeys' },
        ],
      },
      {
        text: 'Authorization',
        items: [
          { text: 'Roles & resource policies', link: '/authorization' },
          { text: 'Organizations & teams', link: '/organizations' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'Vibecn compositions', link: '/vibecn' },
          { text: 'VibeForm & VibeQuery', link: '/ecosystem' },
          { text: 'Databases & migrations', link: '/databases' },
          { text: 'Cloudflare D1', link: '/cloudflare' },
        ],
      },
      {
        text: 'Ship & maintain',
        items: [
          { text: 'Security guide', link: '/security' },
          { text: 'Threat model', link: '/threat-model' },
          { text: 'Production deployment', link: '/deployment' },
          { text: 'Testing & TypeScript', link: '/testing' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
          { text: 'API reference', link: '/api' },
          { text: 'Migration guide', link: '/migration' },
          { text: 'Verification & limits', link: '/verification' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/vibejs/vibeauth' }],
    footer: {
      message: 'MIT licensed. Better Auth owns authentication; VibeAuth connects it to vibe.js.',
      copyright: 'vibe.js contributors',
    },
  },
});
