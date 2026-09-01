import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TextDecoder } from 'node:util';
import { GradientProfile, normalizeProfile } from './model';

export const SIMPLE_RAG_EXTENSION_ID = 'simple-gradient-studio';

const REGISTRY_SCHEMA_VERSION = 1;
const REGISTRY_FILENAME = 'registry.json';
const PACKAGE_DIRECTORY = 'packages';
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 16 * 1024 * 1024;
const MAX_REGISTRY_ENTRIES = 128;
const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REQUIRED_SCRIPTS = ['profile.js', 'simple-gradient-studio-bundle.js', 'simple-gradient-runtime.js'] as const;
const REQUIRED_STYLES = ['simple-gradient-runtime.css'] as const;
const REQUIRED_SURFACES = ['advanced', 'comfy'] as const;

interface ExtensionAsset {
  path: string;
  sha256: string;
  size: number;
}

interface LocalExtensionManifest {
  schema_version: 1;
  id: typeof SIMPLE_RAG_EXTENSION_ID;
  version: string;
  enabled: true;
  surfaces: string[];
  scripts: ExtensionAsset[];
  styles: ExtensionAsset[];
}

interface LocalExtensionRegistry {
  schema_version: 1;
  extensions: unknown[];
  [key: string]: unknown;
}

interface LoadedPackage {
  manifest: LocalExtensionManifest;
  manifestBytes: Buffer;
  manifestSha256: string;
  assets: Map<string, Buffer>;
}

export interface InstallSimpleRagExtensionOptions {
  /** The extension's trusted `simplerag-extension` package directory. */
  packageRoot: string;
  /** Must be the version from VS Code's ExtensionContext.extension.packageJSON. */
  expectedVersion: string;
  /** The current Studio profile. It is normalized again before serialization. */
  profile: GradientProfile;
  /** Test-only override. Production callers should use resolveSimpleRagRegistryRoot(). */
  registryRoot?: string;
}

export interface SimpleRagExtensionInstallResult {
  extensionId: typeof SIMPLE_RAG_EXTENSION_ID;
  version: string;
  registryRoot: string;
  packagePath: string;
  manifestSha256: string;
  packageCopied: boolean;
  registryUpdated: boolean;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === 'object' && (error as NodeJS.ErrnoException).code === code);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeUtf8(bytes: Uint8Array, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid UTF-8: ${describeError(error)}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function assertWithin(root: string, candidate: string, label: string): void {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (!relative || relative === '.') {
    return;
  }
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`${label} is outside the SimpleRAG extension registry.`);
  }
}

async function lstatOrUndefined(candidate: string) {
  try {
    return await fs.lstat(candidate);
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return undefined;
    }
    throw error;
  }
}

async function assertPlainDirectory(candidate: string, label: string): Promise<void> {
  const stat = await fs.lstat(candidate);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory, not a file, symlink, or junction.`);
  }
}

async function ensurePlainDirectory(candidate: string, label: string): Promise<void> {
  const existing = await lstatOrUndefined(candidate);
  if (!existing) {
    await fs.mkdir(candidate, { recursive: true });
  }
  await assertPlainDirectory(candidate, label);
}

async function readBoundedRegularFile(
  candidate: string,
  maximumBytes: number,
  label: string
): Promise<Buffer> {
  const initial = await fs.lstat(candidate);
  if (!initial.isFile() || initial.isSymbolicLink()) {
    throw new Error(`${label} must be a regular file.`);
  }
  if (initial.size > maximumBytes) {
    throw new Error(`${label} exceeds the ${maximumBytes}-byte safety limit.`);
  }

  const handle = await fs.open(candidate, 'r');
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size !== initial.size || opened.size > maximumBytes) {
      throw new Error(`${label} changed while it was being opened.`);
    }
    const output = Buffer.alloc(opened.size + 1);
    let offset = 0;
    while (offset < output.length) {
      const { bytesRead } = await handle.read(output, offset, output.length - offset, offset);
      if (!bytesRead) {
        break;
      }
      offset += bytesRead;
    }
    const final = await handle.stat();
    if (offset !== opened.size || final.size !== opened.size) {
      throw new Error(`${label} changed while it was being read.`);
    }
    return output.subarray(0, offset);
  } finally {
    await handle.close();
  }
}

function parseAssetList(value: unknown, label: string, required: readonly string[]): ExtensionAsset[] {
  if (!Array.isArray(value) || value.length !== required.length) {
    throw new Error(`${label} must declare exactly: ${required.join(', ')}.`);
  }
  const assets = value.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`${label}[${index}] must be an object.`);
    }
    const assetPath = typeof candidate.path === 'string' ? candidate.path : '';
    const assetHash = typeof candidate.sha256 === 'string' ? candidate.sha256.toLowerCase() : '';
    const assetSize = Number(candidate.size);
    if (assetPath !== required[index]) {
      throw new Error(`${label}[${index}].path must be ${required[index]}.`);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(assetPath)) {
      throw new Error(`${label}[${index}].path is unsafe.`);
    }
    if (!SHA256.test(assetHash)) {
      throw new Error(`${label}[${index}].sha256 must be a lowercase SHA-256 digest.`);
    }
    if (!Number.isSafeInteger(assetSize) || assetSize < 0 || assetSize > MAX_ASSET_BYTES) {
      throw new Error(`${label}[${index}].size is outside the supported range.`);
    }
    return { path: assetPath, sha256: assetHash, size: assetSize };
  });
  if (new Set(assets.map(asset => asset.path)).size !== assets.length) {
    throw new Error(`${label} contains a duplicate asset path.`);
  }
  return assets;
}

function parseManifest(value: unknown, expectedVersion: string): LocalExtensionManifest {
  if (!isRecord(value)) {
    throw new Error('SimpleRAG extension manifest must be a JSON object.');
  }
  if (value.schema_version !== REGISTRY_SCHEMA_VERSION) {
    throw new Error('SimpleRAG extension manifest must use schema_version 1.');
  }
  if (value.id !== SIMPLE_RAG_EXTENSION_ID) {
    throw new Error(`SimpleRAG extension manifest id must be ${SIMPLE_RAG_EXTENSION_ID}.`);
  }
  if (value.version !== expectedVersion || !SEMVER.test(expectedVersion)) {
    throw new Error(`SimpleRAG extension manifest version must match the VS Code extension version (${expectedVersion}).`);
  }
  if (value.enabled !== true) {
    throw new Error('SimpleRAG extension manifest must be enabled.');
  }
  if (
    !Array.isArray(value.surfaces)
    || value.surfaces.length !== REQUIRED_SURFACES.length
    || value.surfaces.some((surface, index) => surface !== REQUIRED_SURFACES[index])
  ) {
    throw new Error(`SimpleRAG extension surfaces must be exactly: ${REQUIRED_SURFACES.join(', ')}.`);
  }
  return {
    schema_version: 1,
    id: SIMPLE_RAG_EXTENSION_ID,
    version: expectedVersion,
    enabled: true,
    surfaces: [...REQUIRED_SURFACES],
    scripts: parseAssetList(value.scripts, 'scripts', REQUIRED_SCRIPTS),
    styles: parseAssetList(value.styles, 'styles', REQUIRED_STYLES)
  };
}

async function loadPackage(packageRoot: string, expectedVersion: string): Promise<LoadedPackage> {
  if (!SEMVER.test(expectedVersion)) {
    throw new Error(`VS Code extension version is not valid SemVer: ${expectedVersion}.`);
  }
  await assertPlainDirectory(packageRoot, 'SimpleRAG extension package');
  const manifestPath = path.join(packageRoot, 'manifest.json');
  assertWithin(packageRoot, manifestPath, 'Manifest path');
  const manifestBytes = await readBoundedRegularFile(manifestPath, MAX_MANIFEST_BYTES, 'SimpleRAG extension manifest');
  let rawManifest: unknown;
  try {
    rawManifest = JSON.parse(decodeUtf8(manifestBytes, 'SimpleRAG extension manifest'));
  } catch (error) {
    throw new Error(`SimpleRAG extension manifest is not valid UTF-8 JSON: ${describeError(error)}.`);
  }
  const manifest = parseManifest(rawManifest, expectedVersion);
  const assets = new Map<string, Buffer>();
  let packageBytes = manifestBytes.length;
  for (const asset of [...manifest.scripts, ...manifest.styles]) {
    const assetPath = path.join(packageRoot, asset.path);
    assertWithin(packageRoot, assetPath, `Asset ${asset.path}`);
    const bytes = await readBoundedRegularFile(assetPath, MAX_ASSET_BYTES, `SimpleRAG extension asset ${asset.path}`);
    packageBytes += bytes.length;
    if (packageBytes > MAX_PACKAGE_BYTES) {
      throw new Error(`SimpleRAG extension package exceeds the ${MAX_PACKAGE_BYTES}-byte safety limit.`);
    }
    if (bytes.length !== asset.size || sha256(bytes) !== asset.sha256) {
      throw new Error(`SimpleRAG extension asset ${asset.path} does not match its declared size and SHA-256.`);
    }
    assets.set(asset.path, bytes);
  }
  return {
    manifest,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
    assets
  };
}

function packageWithProfile(loaded: LoadedPackage, profileValue: unknown): LoadedPackage {
  const profile = normalizeProfile(profileValue);
  const serializedProfile = JSON.stringify(profile)
    .replace(/</g, '\\u003C')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const profileBytes = Buffer.from(
    `window.__SIMPLE_GRADIENT_PROFILE__ = ${serializedProfile};\n`,
    'utf8'
  );
  const assets = new Map(loaded.assets);
  assets.set('profile.js', profileBytes);
  const scripts = loaded.manifest.scripts.map(asset => asset.path === 'profile.js'
    ? { path: asset.path, size: profileBytes.length, sha256: sha256(profileBytes) }
    : { ...asset });
  const manifest: LocalExtensionManifest = {
    ...loaded.manifest,
    surfaces: [...loaded.manifest.surfaces],
    scripts,
    styles: loaded.manifest.styles.map(asset => ({ ...asset }))
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (manifestBytes.length > MAX_MANIFEST_BYTES) {
    throw new Error('Generated SimpleRAG extension manifest exceeds its safety limit.');
  }
  return {
    manifest,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
    assets
  };
}

async function readRegistry(registryPath: string): Promise<{ registry: LocalExtensionRegistry; bytes?: Buffer }> {
  const existing = await lstatOrUndefined(registryPath);
  if (!existing) {
    return { registry: { schema_version: 1, extensions: [] } };
  }
  if (!existing.isFile() || existing.isSymbolicLink()) {
    throw new Error('SimpleRAG extension registry must be a regular file.');
  }
  const bytes = await readBoundedRegularFile(registryPath, MAX_MANIFEST_BYTES, 'SimpleRAG extension registry');
  let value: unknown;
  try {
    value = JSON.parse(decodeUtf8(bytes, 'SimpleRAG extension registry'));
  } catch (error) {
    throw new Error(`SimpleRAG extension registry is not valid UTF-8 JSON: ${describeError(error)}.`);
  }
  if (
    !isRecord(value)
    || value.schema_version !== REGISTRY_SCHEMA_VERSION
    || !Array.isArray(value.extensions)
    || value.extensions.length > MAX_REGISTRY_ENTRIES
  ) {
    throw new Error('SimpleRAG extension registry does not satisfy schema_version 1.');
  }
  return { registry: value as LocalExtensionRegistry, bytes };
}

function registryWithPackage(
  registry: LocalExtensionRegistry,
  version: string,
  manifestSha256: string
): LocalExtensionRegistry {
  const entry = {
    id: SIMPLE_RAG_EXTENSION_ID,
    version,
    enabled: true,
    manifest_sha256: manifestSha256
  };
  const targetIndices: number[] = [];
  registry.extensions.forEach((candidate, index) => {
    if (isRecord(candidate) && candidate.id === SIMPLE_RAG_EXTENSION_ID) {
      targetIndices.push(index);
    }
  });
  const insertionIndex = targetIndices[0] ?? registry.extensions.length;
  const extensions = registry.extensions.filter(candidate => (
    !isRecord(candidate) || candidate.id !== SIMPLE_RAG_EXTENSION_ID
  ));
  extensions.splice(Math.min(insertionIndex, extensions.length), 0, entry);
  if (extensions.length > MAX_REGISTRY_ENTRIES) {
    throw new Error(`SimpleRAG extension registry already contains the maximum of ${MAX_REGISTRY_ENTRIES} entries.`);
  }
  return { ...registry, schema_version: 1, extensions };
}

interface PackageTransaction {
  packagePath: string;
  extensionRoot: string;
  changed: boolean;
  previousPath?: string;
}

async function writeStagedPackage(stagingRoot: string, loaded: LoadedPackage): Promise<void> {
  for (const [assetPath, bytes] of loaded.assets) {
    const destination = path.join(stagingRoot, assetPath);
    assertWithin(stagingRoot, destination, `Staged asset ${assetPath}`);
    await fs.writeFile(destination, bytes, { flag: 'wx' });
  }
  await fs.writeFile(path.join(stagingRoot, 'manifest.json'), loaded.manifestBytes, { flag: 'wx' });
  const staged = await loadPackage(stagingRoot, loaded.manifest.version);
  if (staged.manifestSha256 !== loaded.manifestSha256) {
    throw new Error('Staged SimpleRAG package failed its post-copy hash check.');
  }
}

async function swapPackage(
  registryRoot: string,
  loaded: LoadedPackage
): Promise<PackageTransaction> {
  const packagesRoot = path.join(registryRoot, PACKAGE_DIRECTORY);
  const extensionRoot = path.join(packagesRoot, SIMPLE_RAG_EXTENSION_ID);
  const packagePath = path.join(extensionRoot, loaded.manifest.version);
  for (const [candidate, label] of [
    [packagesRoot, 'SimpleRAG package directory'],
    [extensionRoot, 'SimpleGradient package directory']
  ] as const) {
    assertWithin(registryRoot, candidate, label);
    await ensurePlainDirectory(candidate, label);
  }
  assertWithin(extensionRoot, packagePath, 'Versioned SimpleGradient package');

  const existing = await lstatOrUndefined(packagePath);
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink()) {
      throw new Error(`SimpleRAG package destination is not a real directory: ${packagePath}.`);
    }
    const installed = await loadPackage(packagePath, loaded.manifest.version);
    if (installed.manifestSha256 === loaded.manifestSha256) {
      return { packagePath, extensionRoot, changed: false };
    }
  }

  const stagingRoot = await fs.mkdtemp(path.join(extensionRoot, '.install-'));
  assertWithin(extensionRoot, stagingRoot, 'SimpleGradient staging directory');
  let stagingMoved = false;
  let previousPath: string | undefined;
  try {
    await writeStagedPackage(stagingRoot, loaded);
    if (existing) {
      const token = randomBytes(8).toString('hex');
      previousPath = path.join(extensionRoot, `.previous-${loaded.manifest.version}-${token}`);
      assertWithin(extensionRoot, previousPath, 'Previous SimpleGradient package');
      await fs.rename(packagePath, previousPath);
      try {
        await fs.rename(stagingRoot, packagePath);
        stagingMoved = true;
      } catch (error) {
        await fs.rename(previousPath, packagePath);
        previousPath = undefined;
        throw error;
      }
    } else {
      await fs.rename(stagingRoot, packagePath);
      stagingMoved = true;
    }
    return { packagePath, extensionRoot, previousPath, changed: true };
  } finally {
    if (!stagingMoved) {
      const relative = path.relative(extensionRoot, stagingRoot);
      if (relative.startsWith('.install-') && !relative.includes(path.sep)) {
        await fs.rm(stagingRoot, { recursive: true, force: true });
      }
    }
  }
}

async function rollbackPackage(transaction: PackageTransaction): Promise<void> {
  if (!transaction.changed) {
    return;
  }
  if (!transaction.previousPath) {
    assertWithin(transaction.extensionRoot, transaction.packagePath, 'New SimpleGradient package');
    await fs.rm(transaction.packagePath, { recursive: true, force: true });
    return;
  }
  assertWithin(transaction.extensionRoot, transaction.previousPath, 'Previous SimpleGradient package');
  const discardPath = path.join(
    transaction.extensionRoot,
    `.rollback-${path.basename(transaction.packagePath)}-${randomBytes(8).toString('hex')}`
  );
  assertWithin(transaction.extensionRoot, discardPath, 'Rolled-back SimpleGradient package');
  await fs.rename(transaction.packagePath, discardPath);
  try {
    await fs.rename(transaction.previousPath, transaction.packagePath);
  } catch (error) {
    await fs.rename(discardPath, transaction.packagePath);
    throw error;
  }
  await fs.rm(discardPath, { recursive: true, force: true });
}

async function finalizePackage(transaction: PackageTransaction): Promise<void> {
  if (!transaction.previousPath) {
    return;
  }
  assertWithin(transaction.extensionRoot, transaction.previousPath, 'Previous SimpleGradient package');
  await fs.rm(transaction.previousPath, { recursive: true, force: true });
}

async function writeRegistryAtomically(
  registryRoot: string,
  registryPath: string,
  previousBytes: Buffer | undefined,
  registry: LocalExtensionRegistry
): Promise<void> {
  const bytes = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  if (bytes.length > MAX_MANIFEST_BYTES) {
    throw new Error(`Updated SimpleRAG extension registry exceeds the ${MAX_MANIFEST_BYTES}-byte safety limit.`);
  }
  const token = randomBytes(8).toString('hex');
  const temporaryPath = path.join(registryRoot, `.registry-${process.pid}-${token}.tmp`);
  assertWithin(registryRoot, temporaryPath, 'Temporary registry');
  const handle = await fs.open(temporaryPath, 'wx');
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    const current = await lstatOrUndefined(registryPath);
    if (previousBytes) {
      if (!current || !current.isFile() || current.isSymbolicLink()) {
        throw new Error('SimpleRAG extension registry changed during installation; retry the command.');
      }
      const currentBytes = await readBoundedRegularFile(registryPath, MAX_MANIFEST_BYTES, 'SimpleRAG extension registry');
      if (sha256(currentBytes) !== sha256(previousBytes)) {
        throw new Error('SimpleRAG extension registry changed during installation; retry the command.');
      }
    } else if (current) {
      throw new Error('SimpleRAG extension registry was created during installation; retry the command.');
    }
    await fs.rename(temporaryPath, registryPath);
  } finally {
    const temporary = await lstatOrUndefined(temporaryPath);
    if (temporary?.isFile() && !temporary.isSymbolicLink()) {
      await fs.unlink(temporaryPath);
    }
  }
}

export function resolveSimpleRagRegistryRoot(environment: NodeJS.ProcessEnv = process.env): string {
  const localAppData = String(environment.LOCALAPPDATA || '').trim();
  if (!localAppData || localAppData.includes('\0') || !path.isAbsolute(localAppData)) {
    throw new Error('LOCALAPPDATA is unavailable, so the installed SimpleRAG extension registry cannot be located safely.');
  }
  return path.join(path.resolve(localAppData), 'RAGWorkspace', 'extensions');
}

export async function installSimpleRagExtension(
  options: InstallSimpleRagExtensionOptions
): Promise<SimpleRagExtensionInstallResult> {
  const packageRoot = path.resolve(options.packageRoot);
  const expectedVersion = String(options.expectedVersion || '').trim();
  const registryRoot = path.resolve(options.registryRoot || resolveSimpleRagRegistryRoot());
  const registryPath = path.join(registryRoot, REGISTRY_FILENAME);
  assertWithin(registryRoot, registryPath, 'SimpleRAG extension registry');

  const loaded = packageWithProfile(
    await loadPackage(packageRoot, expectedVersion),
    options.profile
  );
  await ensurePlainDirectory(registryRoot, 'SimpleRAG extension registry directory');
  const lockPath = path.join(registryRoot, `.${SIMPLE_RAG_EXTENSION_ID}.install.lock`);
  assertWithin(registryRoot, lockPath, 'SimpleGradient installer lock');

  let lock;
  try {
    lock = await fs.open(lockPath, 'wx');
  } catch (error) {
    if (isNodeError(error, 'EEXIST')) {
      throw new Error('Another SimpleGradient installation is already updating the SimpleRAG extension registry.');
    }
    throw error;
  }

  try {
    await lock.writeFile(`${JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() })}\n`);
    await lock.sync();
    const before = await readRegistry(registryPath);
    const transaction = await swapPackage(registryRoot, loaded);
    const nextRegistry = registryWithPackage(before.registry, expectedVersion, loaded.manifestSha256);
    const registryUpdated = JSON.stringify(nextRegistry) !== JSON.stringify(before.registry);
    let registryCommitted = false;
    try {
      if (registryUpdated) {
        await writeRegistryAtomically(registryRoot, registryPath, before.bytes, nextRegistry);
      }
      registryCommitted = true;
    } catch (error) {
      await rollbackPackage(transaction);
      throw error;
    }

    try {
      const verifiedRegistry = await readRegistry(registryPath);
      const matchingEntries = verifiedRegistry.registry.extensions.filter(candidate => (
        isRecord(candidate)
        && candidate.id === SIMPLE_RAG_EXTENSION_ID
        && candidate.version === expectedVersion
        && candidate.enabled === true
        && candidate.manifest_sha256 === loaded.manifestSha256
      ));
      if (matchingEntries.length !== 1) {
        throw new Error('SimpleRAG extension registry verification did not find exactly one enabled SimpleGradient entry.');
      }
      const installed = await loadPackage(transaction.packagePath, expectedVersion);
      if (installed.manifestSha256 !== loaded.manifestSha256) {
        throw new Error('Installed SimpleRAG extension package failed its final hash verification.');
      }
    } finally {
      if (registryCommitted) {
        await finalizePackage(transaction);
      }
    }
    return {
      extensionId: SIMPLE_RAG_EXTENSION_ID,
      version: expectedVersion,
      registryRoot,
      packagePath: transaction.packagePath,
      manifestSha256: loaded.manifestSha256,
      packageCopied: transaction.changed,
      registryUpdated
    };
  } finally {
    await lock.close();
    const lockStat = await lstatOrUndefined(lockPath);
    if (lockStat?.isFile() && !lockStat.isSymbolicLink()) {
      await fs.unlink(lockPath);
    }
  }
}

