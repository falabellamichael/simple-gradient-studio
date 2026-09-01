const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { createDefaultProfile } = require('../out/model.js');
const {
  SIMPLE_RAG_EXTENSION_ID,
  installSimpleRagExtension
} = require('../out/simplerag.js');

const VERSION = '0.2.0';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function createPackage(root, { badRuntimeHash = false } = {}) {
  await fs.mkdir(root, { recursive: true });
  const files = {
    'profile.js': Buffer.from('window.__SIMPLE_GRADIENT_PROFILE__ = {};\n'),
    'simple-gradient-runtime.js': Buffer.from('window.SimpleGradientRuntime = { ready: true };\n'),
    'simple-gradient-runtime.css': Buffer.from(':root { --simple-gradient-ready: 1; }\n')
  };
  for (const [filename, bytes] of Object.entries(files)) {
    await fs.writeFile(path.join(root, filename), bytes);
  }
  const asset = (filename) => ({
    path: filename,
    sha256: filename === 'simple-gradient-runtime.js' && badRuntimeHash ? '0'.repeat(64) : sha256(files[filename]),
    size: files[filename].length
  });
  const manifest = {
    schema_version: 1,
    id: SIMPLE_RAG_EXTENSION_ID,
    version: VERSION,
    enabled: true,
    surfaces: ['advanced', 'comfy'],
    scripts: [asset('profile.js'), asset('simple-gradient-runtime.js')],
    styles: [asset('simple-gradient-runtime.css')]
  };
  await fs.writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

async function withTempDirectory(t, callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'simple-gradient-registry-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return callback(root);
}

test('installer preserves unrelated registry entries and atomically updates only its owned package', async (t) => {
  await withTempDirectory(t, async (root) => {
    const packageRoot = path.join(root, 'source-package');
    const registryRoot = path.join(root, 'registry');
    const sourceFiles = await createPackage(packageRoot);
    const unrelated = {
      id: 'minilmx-simplerag-mini-agent',
      version: '1.6.4',
      enabled: true,
      manifest_sha256: '640049e35f7f53b964d8e4de137931120bad921926ede4d5852f560fb1debfac'
    };
    const obsoleteTarget = {
      id: SIMPLE_RAG_EXTENSION_ID,
      version: '0.1.0',
      enabled: true,
      manifest_sha256: 'b'.repeat(64)
    };
    await fs.mkdir(registryRoot, { recursive: true });
    await fs.writeFile(path.join(registryRoot, 'registry.json'), `${JSON.stringify({
      schema_version: 1,
      owner_metadata: { retain: true },
      extensions: [unrelated, obsoleteTarget]
    }, null, 2)}\n`);

    const profile = createDefaultProfile();
    profile.name = 'Installed profile';
    const first = await installSimpleRagExtension({
      packageRoot,
      expectedVersion: VERSION,
      profile,
      registryRoot
    });
    assert.equal(first.packageCopied, true);
    assert.equal(first.registryUpdated, true);

    const registry = JSON.parse(await fs.readFile(path.join(registryRoot, 'registry.json'), 'utf8'));
    assert.deepEqual(registry.owner_metadata, { retain: true });
    assert.deepEqual(registry.extensions[0], unrelated);
    assert.equal(registry.extensions.length, 2);
    assert.deepEqual(registry.extensions[1], {
      id: SIMPLE_RAG_EXTENSION_ID,
      version: VERSION,
      enabled: true,
      manifest_sha256: first.manifestSha256
    });

    const installedRoot = path.join(registryRoot, 'packages', SIMPLE_RAG_EXTENSION_ID, VERSION);
    const installedManifestBytes = await fs.readFile(path.join(installedRoot, 'manifest.json'));
    const installedManifest = JSON.parse(installedManifestBytes.toString('utf8'));
    assert.equal(sha256(installedManifestBytes), first.manifestSha256);
    assert.deepEqual(installedManifest.scripts.map(asset => asset.path), [
      'profile.js',
      'simple-gradient-runtime.js'
    ]);
    assert.deepEqual(installedManifest.styles.map(asset => asset.path), [
      'simple-gradient-runtime.css'
    ]);
    assert.deepEqual(
      await fs.readFile(path.join(installedRoot, 'simple-gradient-runtime.js')),
      sourceFiles['simple-gradient-runtime.js']
    );
    assert.deepEqual(
      await fs.readFile(path.join(installedRoot, 'simple-gradient-runtime.css')),
      sourceFiles['simple-gradient-runtime.css']
    );
    const profileSource = await fs.readFile(path.join(installedRoot, 'profile.js'), 'utf8');
    const profileAsset = installedManifest.scripts[0];
    assert.equal(Buffer.byteLength(profileSource), profileAsset.size);
    assert.equal(sha256(Buffer.from(profileSource)), profileAsset.sha256);
    const sandbox = { window: {} };
    vm.runInNewContext(profileSource, sandbox);
    assert.equal(sandbox.window.__SIMPLE_GRADIENT_PROFILE__.name, 'Installed profile');

    const second = await installSimpleRagExtension({
      packageRoot,
      expectedVersion: VERSION,
      profile,
      registryRoot
    });
    assert.equal(second.packageCopied, false);
    assert.equal(second.registryUpdated, false);

    profile.name = 'Updated profile';
    const third = await installSimpleRagExtension({
      packageRoot,
      expectedVersion: VERSION,
      profile,
      registryRoot
    });
    assert.equal(third.packageCopied, true);
    assert.equal(third.registryUpdated, true);
    assert.notEqual(third.manifestSha256, first.manifestSha256);
    const updatedSource = await fs.readFile(path.join(installedRoot, 'profile.js'), 'utf8');
    const updatedSandbox = { window: {} };
    vm.runInNewContext(updatedSource, updatedSandbox);
    assert.equal(updatedSandbox.window.__SIMPLE_GRADIENT_PROFILE__.name, 'Updated profile');
    const updatedRegistry = JSON.parse(await fs.readFile(path.join(registryRoot, 'registry.json'), 'utf8'));
    assert.deepEqual(updatedRegistry.extensions[0], unrelated);
    assert.equal(updatedRegistry.extensions[1].manifest_sha256, third.manifestSha256);
    assert.deepEqual(await fs.readdir(path.dirname(installedRoot)), [VERSION]);
  });
});

test('installer rejects a tampered source asset before touching the live registry', async (t) => {
  await withTempDirectory(t, async (root) => {
    const packageRoot = path.join(root, 'source-package');
    const registryRoot = path.join(root, 'registry');
    await createPackage(packageRoot, { badRuntimeHash: true });
    await assert.rejects(
      installSimpleRagExtension({
        packageRoot,
        expectedVersion: VERSION,
        profile: createDefaultProfile(),
        registryRoot
      }),
      /does not match its declared size and SHA-256/
    );
    await assert.rejects(fs.stat(registryRoot), error => error.code === 'ENOENT');
  });
});

test('installer leaves an invalid existing registry byte-for-byte unchanged', async (t) => {
  await withTempDirectory(t, async (root) => {
    const packageRoot = path.join(root, 'source-package');
    const registryRoot = path.join(root, 'registry');
    await createPackage(packageRoot);
    await fs.mkdir(registryRoot, { recursive: true });
    const invalidRegistry = Buffer.from('{"schema_version":2,"extensions":[]}\n');
    await fs.writeFile(path.join(registryRoot, 'registry.json'), invalidRegistry);
    await assert.rejects(
      installSimpleRagExtension({
        packageRoot,
        expectedVersion: VERSION,
        profile: createDefaultProfile(),
        registryRoot
      }),
      /does not satisfy schema_version 1/
    );
    assert.deepEqual(await fs.readFile(path.join(registryRoot, 'registry.json')), invalidRegistry);
    assert.deepEqual(await fs.readdir(registryRoot), ['registry.json']);
  });
});
