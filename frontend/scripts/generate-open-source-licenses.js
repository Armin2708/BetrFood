const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const nodeModulesDir = path.join(rootDir, 'node_modules');
const outputDir = path.join(rootDir, 'assets', 'data');
const outputPath = path.join(outputDir, 'open-source-licenses.json');
const packageLock = fs.existsSync(packageLockPath)
  ? JSON.parse(fs.readFileSync(packageLockPath, 'utf8'))
  : null;

const LICENSE_FILE_NAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENSE-MIT',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt',
];

function normalizeLicense(license) {
  if (!license) return 'Unknown';
  if (typeof license === 'string') return license;
  if (typeof license === 'object') {
    if (typeof license.type === 'string') return license.type;
    if (Array.isArray(license)) {
      return license
        .map((entry) => normalizeLicense(entry))
        .filter(Boolean)
        .join(', ');
    }
  }
  return 'Unknown';
}

function findLicenseText(packageDir) {
  for (const filename of LICENSE_FILE_NAMES) {
    const fullPath = path.join(packageDir, filename);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8').trim();
    }
  }
  return null;
}

function buildLicenseEntry(packageName) {
  const packageDir = path.join(nodeModulesDir, packageName);
  const installedPackageJsonPath = path.join(packageDir, 'package.json');
  const lockPackage = packageLock?.packages?.[`node_modules/${packageName}`];

  if (!fs.existsSync(installedPackageJsonPath)) {
    return {
      name: packageName,
      version: lockPackage?.version || 'Unknown',
      licenseType: normalizeLicense(lockPackage?.license),
      licenseText: `License text was not found in the local install for ${packageName}. Declared license: ${normalizeLicense(lockPackage?.license)}.`,
    };
  }

  const installedPackage = JSON.parse(fs.readFileSync(installedPackageJsonPath, 'utf8'));
  const licenseType = normalizeLicense(installedPackage.license || installedPackage.licenses);
  const licenseText = findLicenseText(packageDir)
    || `License text not bundled with this package. Declared license: ${licenseType}.`;

  return {
    name: installedPackage.name,
    version: installedPackage.version,
    licenseType,
    licenseText,
  };
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencyNames = Object.keys(packageJson.dependencies || {});

  const libraries = dependencyNames
    .map(buildLicenseEntry)
    .sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'frontend/package.json dependencies',
    libraryCount: libraries.length,
    libraries,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Generated ${libraries.length} license entries at ${outputPath}`);
}

main();
