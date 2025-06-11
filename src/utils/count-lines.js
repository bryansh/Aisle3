#!/usr/bin/env node
// @ts-check

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively find files with given extensions
 * @param {string} dir - Directory to search
 * @param {string[]} extensions - File extensions to match
 * @param {string[]} excludePaths - Paths to exclude
 * @returns {string[]} Array of file paths
 */
function findFiles(dir, extensions, excludePaths = []) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(process.cwd(), fullPath);
    
    // Skip excluded paths
    if (excludePaths.some(exclude => relativePath.includes(exclude))) {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, extensions, excludePaths));
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Count lines in a file
 * @param {string} filePath - Path to file
 * @returns {number} Number of lines
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}`);
    return 0;
  }
}

/**
 * Analyze files and return statistics
 * @param {string[]} files - Array of file paths
 * @returns {{files: Array<{path: string, lines: number}>, totalLines: number, totalFiles: number}} Analysis results
 */
function analyzeFiles(files) {
  const results = {
    files: [],
    totalLines: 0,
    totalFiles: files.length
  };
  
  for (const file of files) {
    const lines = countLines(file);
    const relativePath = path.relative(process.cwd(), file);
    
    results.files.push({
      path: relativePath,
      lines: lines
    });
    
    results.totalLines += lines;
  }
  
  // Sort by line count descending
  results.files.sort((a, b) => b.lines - a.lines);
  
  return results;
}

/**
 * Main analysis function
 */
function analyzeProject() {
  const excludePaths = [
    'node_modules',
    'target',
    'coverage',
    'build',
    'dist',
    '.svelte-kit',
    'playwright-report',
    '.git'
  ];
  
  console.log('🔍 Analyzing project code...\n');
  
  // Find main application files
  const svelteFiles = findFiles('src', ['.svelte'], [...excludePaths, 'test']);
  const jsFiles = findFiles('src', ['.js', '.ts'], [...excludePaths, 'test']);
  const rustFiles = findFiles('src-tauri/src', ['.rs'], excludePaths);
  
  // Find test files
  const testJsFiles = findFiles('src', ['.js', '.ts'], excludePaths).filter(file => 
    file.includes('test') || file.includes('spec') || file.includes('__mocks__')
  );
  const testRustFiles = findFiles('src-tauri/tests', ['.rs'], excludePaths);
  
  // Analyze each category
  const svelteAnalysis = analyzeFiles(svelteFiles);
  const jsAnalysis = analyzeFiles(jsFiles);
  const rustAnalysis = analyzeFiles(rustFiles);
  const testJsAnalysis = analyzeFiles(testJsFiles);
  const testRustAnalysis = analyzeFiles(testRustFiles);
  
  // Display results
  console.log('📊 LINES OF CODE SUMMARY\n');
  console.log('=' .repeat(50));
  
  const mainTotal = svelteAnalysis.totalLines + jsAnalysis.totalLines + rustAnalysis.totalLines;
  const testTotal = testJsAnalysis.totalLines + testRustAnalysis.totalLines;
  const grandTotal = mainTotal + testTotal;
  
  console.log(`\n🏗️  MAIN APPLICATION CODE: ${mainTotal.toLocaleString()} lines`);
  console.log(`   • Svelte Components: ${svelteAnalysis.totalLines.toLocaleString()} lines (${svelteAnalysis.totalFiles} files)`);
  console.log(`   • JavaScript/TypeScript: ${jsAnalysis.totalLines.toLocaleString()} lines (${jsAnalysis.totalFiles} files)`);
  console.log(`   • Rust: ${rustAnalysis.totalLines.toLocaleString()} lines (${rustAnalysis.totalFiles} files)`);
  
  console.log(`\n🧪 TEST CODE: ${testTotal.toLocaleString()} lines`);
  console.log(`   • JavaScript/TypeScript Tests: ${testJsAnalysis.totalLines.toLocaleString()} lines (${testJsAnalysis.totalFiles} files)`);
  console.log(`   • Rust Tests: ${testRustAnalysis.totalLines.toLocaleString()} lines (${testRustAnalysis.totalFiles} files)`);
  
  console.log(`\n📈 TOTAL SOURCE CODE: ${grandTotal.toLocaleString()} lines`);
  
  // Show largest files by category
  console.log('\n' + '=' .repeat(50));
  console.log('\n📋 LARGEST FILES BY CATEGORY\n');
  
  if (svelteAnalysis.files.length > 0) {
    console.log('🎨 Largest Svelte Components:');
    svelteAnalysis.files.slice(0, 5).forEach(file => {
      console.log(`   • ${path.basename(file.path)}: ${file.lines} lines`);
    });
  }
  
  if (jsAnalysis.files.length > 0) {
    console.log('\n💻 Largest JavaScript/TypeScript:');
    jsAnalysis.files.slice(0, 5).forEach(file => {
      console.log(`   • ${path.basename(file.path)}: ${file.lines} lines`);
    });
  }
  
  if (rustAnalysis.files.length > 0) {
    console.log('\n⚡ Rust Backend:');
    rustAnalysis.files.forEach(file => {
      console.log(`   • ${path.basename(file.path)}: ${file.lines} lines`);
    });
  }
  
  // Show options
  console.log('\n' + '=' .repeat(50));
  console.log('\n⚙️  OPTIONS:');
  console.log('   --detailed    Show detailed file listing');
  console.log('   --help        Show this help message');
  
  // Handle detailed output
  if (process.argv.includes('--detailed')) {
    console.log('\n📝 DETAILED FILE LISTING\n');
    
    console.log('Svelte Components:');
    svelteAnalysis.files.forEach(file => {
      console.log(`   ${file.lines.toString().padStart(4)} lines - ${file.path}`);
    });
    
    console.log('\nJavaScript/TypeScript:');
    jsAnalysis.files.forEach(file => {
      console.log(`   ${file.lines.toString().padStart(4)} lines - ${file.path}`);
    });
    
    console.log('\nRust:');
    rustAnalysis.files.forEach(file => {
      console.log(`   ${file.lines.toString().padStart(4)} lines - ${file.path}`);
    });
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🔢 PROJECT LINE COUNTER

Usage: node src/utils/count-lines.js [options]

Options:
  --detailed    Show detailed file listing with line counts
  --help        Show this help message

Examples:
  node src/utils/count-lines.js
  node src/utils/count-lines.js --detailed

This tool analyzes your project and counts lines of code in:
- Svelte components (.svelte)
- JavaScript/TypeScript files (.js, .ts)  
- Rust source files (.rs)

It excludes common build/dependency directories and separates
main application code from test code.
`);
}

// Main execution
if (process.argv.includes('--help')) {
  showHelp();
} else {
  analyzeProject();
}