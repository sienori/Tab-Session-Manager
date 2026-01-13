#!/usr/bin/env node
/**
 * Increment the browser extension version across the manifests stored in src/ and
 * optionally sync package metadata.
 *
 * Usage examples:
 *   node scripts/bump-version.js                # increments the build segment (4th number)
 *   node scripts/bump-version.js --part minor   # increments the minor segment
 *   node scripts/bump-version.js --sync-package # also updates package.json & package-lock.json
 *   node scripts/bump-version.js --dry-run      # show the next version without touching files
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const packagePath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');

const manifestTargets = [
  { label: 'src/manifest.json', filePath: path.join(projectRoot, 'src', 'manifest.json') },
  { label: 'src/manifest-ff.json', filePath: path.join(projectRoot, 'src', 'manifest-ff.json') },
];

const PARTS = ['major', 'minor', 'patch', 'build'];
const args = process.argv.slice(2);

const targetPart = getArgValue('--part') || 'build';
const syncPackage = hasFlag('--sync-package');
const dryRun = hasFlag('--dry-run');

if (!PARTS.includes(targetPart)) {
  console.error(
    `[bump-version] Invalid part "${targetPart}". Allowed values: ${PARTS.join(', ')}`
  );
  process.exit(1);
}

const manifests = manifestTargets
  .filter(({ filePath }) => fs.existsSync(filePath))
  .map((target) => ({
    ...target,
    contents: readJson(target.filePath),
  }));

if (manifests.length === 0) {
  console.error('[bump-version] No manifests found under src/.');
  process.exit(1);
}

const distinctVersions = [...new Set(manifests.map(({ contents }) => contents.version || '0.0.0.0'))];
if (distinctVersions.length > 1) {
  console.error(
    `[bump-version] Manifest versions do not match (${distinctVersions.join(' vs ')}). Align them manually first.`
  );
  process.exit(1);
}

const currentVersion = distinctVersions[0];
const nextVersion = bumpVersion(currentVersion, targetPart);

if (!dryRun) {
  manifests.forEach(({ filePath, contents }) => {
    contents.version = nextVersion;
    writeJson(filePath, contents);
  });
}

manifests.forEach(({ label }) => logMutation(label, currentVersion, nextVersion, dryRun));

if (syncPackage) {
  if (!fs.existsSync(packagePath)) {
    console.error('[bump-version] package.json not found; cannot sync package metadata');
    process.exit(1);
  }

  const pkg = readJson(packagePath);
  const previousPackageVersion = pkg.version || '0.0.0';
  if (!dryRun) {
    pkg.version = nextVersion;
    writeJson(packagePath, pkg);
  }
  logMutation('package.json', previousPackageVersion, nextVersion, dryRun);

  if (fs.existsSync(packageLockPath)) {
    const pkgLock = readJson(packageLockPath);
    const previousLockVersion = pkgLock.version || previousPackageVersion;
    if (!dryRun) {
      pkgLock.version = nextVersion;
      if (pkgLock.packages && pkgLock.packages['']) {
        pkgLock.packages[''].version = nextVersion;
      }
      writeJson(packageLockPath, pkgLock);
    }
    logMutation('package-lock.json', previousLockVersion, nextVersion, dryRun);
  }
}

function bumpVersion(versionString, part) {
  const sanitized = versionString.trim();
  if (!/^\d+(\.\d+){0,3}$/.test(sanitized)) {
    throw new Error(
      `Cannot bump version "${versionString}". Only numeric segments with up to 4 parts are supported.`
    );
  }

  const segments = sanitized.split('.').map(Number);
  const targetIndex = PARTS.indexOf(part);
  const maxSegments = 4;
  if (segments.length > maxSegments) {
    throw new Error(`Version "${versionString}" has more than ${maxSegments} segments.`);
  }

  const desiredLength = Math.max(segments.length, targetIndex + 1);
  while (segments.length < desiredLength) {
    segments.push(0);
  }

  segments[targetIndex] += 1;
  for (let i = targetIndex + 1; i < segments.length; i += 1) {
    segments[i] = 0;
  }

  return segments.slice(0, Math.max(desiredLength, targetIndex + 1)).join('.');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(`${filePath}`, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function getArgValue(flag) {
  const flagIndex = args.findIndex((arg) => arg === flag);
  if (flagIndex > -1) {
    const value = args[flagIndex + 1];
    if (!value || value.startsWith('--')) {
      console.error(`[bump-version] Missing value for ${flag}`);
      process.exit(1);
    }
    return value;
  }

  const inlineArg = args.find((arg) => arg.startsWith(`${flag}=`));
  if (inlineArg) {
    return inlineArg.split('=')[1];
  }
  return null;
}

function hasFlag(flag) {
  return args.includes(flag);
}

function logMutation(targetFile, previous, next, isDryRun) {
  const action = isDryRun ? 'Would update' : 'Updated';
  console.log(`[bump-version] ${action} ${targetFile}: ${previous} -> ${next}`);
}
