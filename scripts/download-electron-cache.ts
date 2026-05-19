#!/usr/bin/env bun
// Download Electron zip from npmmirror to the local Electron cache.
// Usage: ./scripts/download-electron-cache.ts
import { $ } from 'bun'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
process.chdir(repoRoot)

interface PackageJson {
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
}

const pkg = (await Bun.file(path.join(repoRoot, 'package.json')).json()) as PackageJson
const rawVersion = pkg.devDependencies?.electron ?? pkg.dependencies?.electron ?? ''
if (!rawVersion) {
  console.error('Error: Cannot get electron version from package.json')
  process.exit(1)
}

// Strip semver prefixes
const version = rawVersion.replace(/^[~^]/, '')

const arch = process.arch
const platform = process.platform

const cacheDir = path.join(os.homedir(), 'Library/Caches/electron')
const zipName = `electron-v${version}-${platform}-${arch}.zip`
const zipPath = path.join(cacheDir, zipName)
const url = `https://npmmirror.com/mirrors/electron/v${version}/${zipName}`

console.log('Cleaning old caches...')
await $`rm -rf ${path.join(os.homedir(), 'Library/Caches/electron')} ${path.join(os.homedir(), 'Library/Caches/electron-builder')}`

console.log(`Creating cache dir: ${cacheDir}`)
await $`mkdir -p ${cacheDir}`

console.log(`Downloading Electron ${version} (${arch})...`)
console.log(`URL: ${url}`)

const curlRes = await $`curl -L --progress-bar -o ${zipPath} ${url}`.nothrow()
if (curlRes.exitCode !== 0) {
  console.error('Error: download failed')
  process.exit(1)
}

console.log(`Done! Cached at: ${zipPath}`)
