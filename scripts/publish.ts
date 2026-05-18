#!/usr/bin/env bun
// Publish a GitHub release for Goblin. Builds macOS (.dmg for arm64 and x64),
// tags the current commit with the package.json version, and uploads every
// artifact via `gh release create`.
//
// Usage: ./scripts/publish.ts [--dry-run] [--proxy http://127.0.0.1:7890]
import { $ } from 'bun'
import { mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

const repoRoot = path.resolve(import.meta.dirname, '..')
process.chdir(repoRoot)
$.cwd(repoRoot)

const APP_NAME = 'Goblin'

const { values } = parseArgs({
  options: {
    proxy: { type: 'string' },
    dryrun: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
  },
})
const isDryRun = values.dryrun === true || values['dry-run'] === true

if (values.proxy) {
  for (const k of ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY']) {
    process.env[k] = values.proxy
  }
  console.log(`Using proxy: ${values.proxy}`)
}

if (isDryRun) {
  console.log('Dry run: building artifacts only; skipping git tag, git push, and GitHub release upload.')
}

const { version } = (await Bun.file(path.join(repoRoot, 'package.json')).json()) as {
  version: string
}
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Error: package.json version must be semver-like, got ${JSON.stringify(version)}.`)
  process.exit(1)
}
const tag = `v${version}`

if (process.platform !== 'darwin') {
  console.error('Error: publish currently builds macOS artifacts and must run on macOS.')
  process.exit(1)
}

// Refuse to publish from a dirty tree — the tag should point at a known commit.
if (!isDryRun && (await $`git status --porcelain`.text()).trim() !== '') {
  console.error('Error: working directory is not clean. Commit or stash changes first.')
  process.exit(1)
}

// Refuse to overwrite an existing tag. Bumping requires a package.json change.
if (!isDryRun && (await $`git rev-parse ${tag}`.quiet().nothrow()).exitCode === 0) {
  console.error(`Error: tag ${tag} already exists. Bump version in package.json first.`)
  process.exit(1)
}

async function findAll(pattern: string, what: string, expected: number): Promise<string[]> {
  const glob = new Bun.Glob(pattern)
  const matches = (await Array.fromAsync(glob.scan({ cwd: repoRoot, onlyFiles: true })))
    .map((m) => path.join(repoRoot, m))
    .sort()
  if (matches.length !== expected) {
    console.error(`Error: expected ${expected} ${what} under release/ (pattern: ${pattern}), found ${matches.length}.`)
    process.exit(1)
  }
  return matches
}

// Stash artifacts outside `release/` between builds — `scripts/build.ts`
// wipes `release/` on every invocation. Today there's only one build
// step, so the stash isn't strictly needed; keeping the pattern means
// adding a Windows build later won't require restructuring.
const stash = mkdtempSync(path.join(os.tmpdir(), 'gbl-publish-'))

try {
  console.log(`Building ${tag} (macOS) ...`)
  await $`bun scripts/build.ts`

  // Two dmgs (arm64 + x64) per electron-builder.ts mac.target config.
  const dmgSrcs = await findAll(`release/${APP_NAME}-${version}-*.dmg`, `${APP_NAME} .dmg`, 2)
  const dmgs = dmgSrcs.map((src) => {
    const dest = path.join(stash, path.basename(src))
    renameSync(src, dest)
    return dest
  })

  if (isDryRun) {
    await $`rm -rf release`
    mkdirSync(path.join(repoRoot, 'release'), { recursive: true })
    const artifacts = dmgs.map((src) => {
      const dest = path.join(repoRoot, 'release', path.basename(src))
      renameSync(src, dest)
      return dest
    })
    console.log('Dry run complete. Artifacts:')
    for (const artifact of artifacts) {
      console.log(`- ${path.relative(repoRoot, artifact)}`)
    }
  } else {
    let pushedTag = false
    try {
      await $`git tag -a ${tag} -m ${`Release ${tag}`}`
      await $`git push origin ${tag}`
      pushedTag = true

      // Builds are unsigned. Without these notes Gatekeeper will block the
      // download and users will assume the app is broken.
      const notes = [
        `Unsigned builds.`,
        ``,
        `**macOS** — after installing, run:`,
        '```sh',
        `xattr -dr com.apple.quarantine /Applications/${APP_NAME}.app`,
        '```',
        `Or right-click the app → **Open** → **Open**.`,
      ].join('\n')

      console.log(`Creating GitHub release ${tag} ...`)
      await $`gh release create ${tag} ${dmgs} --title ${tag} --notes ${notes}`
    } catch (err) {
      // If any post-tag step fails, roll back the tag so the next attempt
      // isn't blocked by "tag already exists" and upstream history doesn't
      // collect dangling tags pointing at unreleased commits.
      console.error('Publish failed; rolling back tag.')
      if (pushedTag) await $`git push origin :refs/tags/${tag}`.nothrow()
      await $`git tag -d ${tag}`.nothrow()
      throw err
    }

    await $`rm -rf release`
    console.log(`Published ${tag}`)
  }
} finally {
  // Always clean the stash, even on failure — a leftover temp dir wouldn't
  // block the next attempt (each run mints a fresh `mkdtemp` path), but
  // leaving them around accumulates cruft in /tmp.
  rmSync(stash, { recursive: true, force: true })
}
