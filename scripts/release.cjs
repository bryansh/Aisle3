#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function run(command) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function updateVersion(newVersion) {
  // Update package.json
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // Update Cargo.toml
  const cargoPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  cargoContent = cargoContent.replace(/version = "[^"]*"/, `version = "${newVersion}"`);
  fs.writeFileSync(cargoPath, cargoContent);
  
  // Update tauri.conf.json
  const tauriConfigPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
  const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
  tauriConfig.version = newVersion;
  fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');
  
  console.log(`✅ Updated version to ${newVersion} in all files`);
}

function getCurrentVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function incrementVersion(current, type) {
  const parts = current.split('.').map(Number);
  
  switch (type) {
    case 'patch':
      parts[2]++;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }
  
  return parts.join('.');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npm run release <version|patch|minor|major>');
    console.error('Examples:');
    console.error('  npm run release 1.0.0');
    console.error('  npm run release patch  # 0.2.0 -> 0.2.1');
    console.error('  npm run release minor  # 0.2.0 -> 0.3.0');
    console.error('  npm run release major  # 0.2.0 -> 1.0.0');
    process.exit(1);
  }
  
  const input = args[0];
  const currentVersion = getCurrentVersion();
  
  let newVersion;
  if (['patch', 'minor', 'major'].includes(input)) {
    newVersion = incrementVersion(currentVersion, input);
  } else if (/^\d+\.\d+\.\d+$/.test(input)) {
    newVersion = input;
  } else {
    console.error('❌ Invalid version format. Use semver (e.g., 1.0.0) or patch/minor/major');
    process.exit(1);
  }
  
  console.log(`🚀 Releasing version ${currentVersion} -> ${newVersion}`);
  
  // Check if working directory is clean
  try {
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Working directory is not clean. Please commit or stash changes first.');
    process.exit(1);
  }
  
  // Update version in all files
  updateVersion(newVersion);
  
  // Commit changes
  run('git add .');
  run(`git commit -m "Bump version to v${newVersion}"`);
  
  // Create and push tag
  run(`git tag v${newVersion}`);
  run('git push origin main');
  run(`git push origin v${newVersion}`);
  
  console.log(`🎉 Released v${newVersion}! Check GitHub Actions for build progress.`);
  console.log(`📦 Release will be available at: https://github.com/bryansh/Aisle3/releases/tag/v${newVersion}`);
}

main();