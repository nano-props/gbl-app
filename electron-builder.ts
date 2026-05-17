import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.gbl.app',
  productName: 'GBL',
  // Point at the .icns directly so the multi-resolution variants
  // electron-builder embeds match what we authored. Re-generate via
  // `bun run icon` after editing assets/icon.svg.
  icon: 'assets/icon.icns',
  directories: {
    output: 'release',
  },
  files: [
    'src/main/**/*.ts',
    'src/preload/**/*',
    'dist/renderer/**/*',
    'package.json',
    '!**/*.map',
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    // electron-builder organizes builds by arch, so any `dir` here would be
    // emitted for every arch declared on dmg. `build.ts install` picks the
    // host-arch directory out of `release/mac*/` itself.
    target: [
      { target: 'dmg', arch: ['arm64', 'x64'] },
      { target: 'dir', arch: ['arm64', 'x64'] },
    ],
    identity: null,
    // Force arch into the filename. electron-builder's default omits the
    // suffix on x64, which would make `GBL-0.1.0.dmg` (intel) and
    // `GBL-0.1.0-arm64.dmg` (apple silicon) sort next to each other in
    // releases with no hint of which is which.
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },
}

export default config
