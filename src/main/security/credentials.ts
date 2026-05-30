import { safeStorage, app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import writeFileAtomic from 'write-file-atomic'

export interface CredentialsSnapshot {
  githubTokenConfigured: boolean
  secureStorageAvailable: boolean
}

interface CredentialsData {
  githubToken: string | null
}

function storedGitHubTokenEnabled(host?: string): boolean {
  return host === undefined || host === 'github.com'
}

function normalizeGitHubToken(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export class CredentialsManager {
  private readonly storePath = path.join(app.getPath('userData'), 'credentials.enc')
  private data: CredentialsData = { githubToken: null }

  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }

  snapshot(): CredentialsSnapshot {
    return {
      githubTokenConfigured: this.data.githubToken !== null,
      secureStorageAvailable: this.isAvailable(),
    }
  }

  hasGitHubToken(host?: string): boolean {
    return storedGitHubTokenEnabled(host) && this.data.githubToken !== null
  }

  getGitHubToken(host?: string): string | null {
    return storedGitHubTokenEnabled(host) ? this.data.githubToken : null
  }

  async load(): Promise<void> {
    this.data = { githubToken: null }
    if (!this.isAvailable()) return
    try {
      const encrypted = await fs.readFile(this.storePath)
      const raw = safeStorage.decryptString(encrypted)
      const parsed = JSON.parse(raw) as Partial<CredentialsData>
      this.data = { githubToken: normalizeGitHubToken(parsed.githubToken) }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
      console.error('[credentials] failed to load credentials', err)
    }
  }

  async setGitHubToken(token: string): Promise<CredentialsSnapshot> {
    if (!this.isAvailable()) throw new Error('Secure storage unavailable')
    const normalized = normalizeGitHubToken(token)
    if (!normalized) throw new Error('GitHub token cannot be empty')
    this.data = { githubToken: normalized }
    await this.flush()
    return this.snapshot()
  }

  async clearGitHubToken(): Promise<CredentialsSnapshot> {
    if (!this.isAvailable()) throw new Error('Secure storage unavailable')
    this.data = { githubToken: null }
    await this.flush()
    return this.snapshot()
  }

  private async flush(): Promise<void> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true })
    const encrypted = safeStorage.encryptString(JSON.stringify(this.data))
    await writeFileAtomic(this.storePath, encrypted)
  }
}

let credentialsManagerInstance: CredentialsManager | null = null

export function getCredentialsManager(): CredentialsManager {
  if (!credentialsManagerInstance) credentialsManagerInstance = new CredentialsManager()
  return credentialsManagerInstance
}
