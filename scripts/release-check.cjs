#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(command, description, options = {}) {
  const { cwd = process.cwd(), silent = false } = options;
  
  log(`\n🔍 ${description}...`, 'blue');
  
  try {
    const result = execSync(command, { 
      cwd, 
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    
    log(`✅ ${description} - PASSED`, 'green');
    return { success: true, output: result };
  } catch (error) {
    log(`❌ ${description} - FAILED`, 'red');
    if (silent && error.stdout) {
      console.log(error.stdout);
    }
    if (silent && error.stderr) {
      console.error(error.stderr);
    }
    return { success: false, error };
  }
}

function checkGitStatus() {
  log(`\n🔍 Checking git status...`, 'blue');
  
  try {
    // Check if working directory is clean
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
    log(`✅ Git status - CLEAN`, 'green');
    return true;
  } catch (error) {
    log(`⚠️  Git status - UNCOMMITTED CHANGES`, 'yellow');
    log(`   Working directory has uncommitted changes. Consider committing before release.`, 'yellow');
    return false;
  }
}

function getCurrentVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function main() {
  log(`${colors.bold}🚀 Aisle3 Release Readiness Check${colors.reset}`, 'blue');
  log(`Current version: v${getCurrentVersion()}`, 'blue');
  log(`This runs the same checks as CI to catch issues locally before pushing.`, 'blue');
  
  const checks = [];
  
  // 1. Git Status Check (warning only)
  const gitClean = checkGitStatus();
  
  // 2. Rust Formatting Check (same as CI)
  const rustFmt = run(
    'cargo fmt --check', 
    'Rust formatting check',
    { cwd: path.join(__dirname, '..', 'src-tauri') }
  );
  checks.push(rustFmt);
  
  // 3. Rust Clippy Check (same as CI)
  const rustClippy = run(
    'cargo clippy --all-targets --all-features -- -D warnings', 
    'Rust linting (clippy)',
    { cwd: path.join(__dirname, '..', 'src-tauri') }
  );
  checks.push(rustClippy);
  
  // 4. TypeScript/Svelte Check (same as CI)
  const tsCheck = run(
    'npm run check', 
    'TypeScript/Svelte linting'
  );
  checks.push(tsCheck);
  
  // 5. Rust Tests (same as CI)
  const rustTests = run(
    'cargo test', 
    'Rust tests (43 tests)',
    { cwd: path.join(__dirname, '..', 'src-tauri') }
  );
  checks.push(rustTests);
  
  // 6. JavaScript/Svelte Tests (same as CI)
  const jsTests = run(
    'npm run test:run', 
    'JavaScript/Svelte tests (616 tests)'
  );
  checks.push(jsTests);
  
  // Summary
  log(`\n${colors.bold}📋 Release Readiness Summary${colors.reset}`, 'blue');
  log(`${'='.repeat(50)}`, 'blue');
  
  const failed = checks.filter(check => !check.success);
  const passed = checks.filter(check => check.success);
  
  log(`✅ Passed: ${passed.length}/${checks.length}`, 'green');
  
  if (failed.length > 0) {
    log(`❌ Failed: ${failed.length}/${checks.length}`, 'red');
    log(`\n${colors.bold}❌ NOT READY FOR RELEASE${colors.reset}`, 'red');
    log(`Please fix the failing checks before releasing.`, 'red');
    process.exit(1);
  }
  
  if (!gitClean) {
    log(`\n${colors.bold}⚠️  READY FOR RELEASE (with uncommitted changes)${colors.reset}`, 'yellow');
    log(`All checks passed, but you have uncommitted changes.`, 'yellow');
    log(`Consider committing changes before releasing.`, 'yellow');
  } else {
    log(`\n${colors.bold}🎉 READY FOR RELEASE!${colors.reset}`, 'green');
    log(`All checks passed and git working directory is clean.`, 'green');
  }
  
  log(`\nTo release, run one of:`, 'blue');
  log(`  npm run release:patch   # ${getCurrentVersion()} -> patch bump`, 'blue');
  log(`  npm run release:minor   # ${getCurrentVersion()} -> minor bump`, 'blue');
  log(`  npm run release:major   # ${getCurrentVersion()} -> major bump`, 'blue');
  log(`  npm run release 1.2.3   # ${getCurrentVersion()} -> specific version`, 'blue');
}

main();