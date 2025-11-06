#!/usr/bin/env node
/**
 * Find Redundant Tests - Identifies tests that don't impact 100% coverage
 * Usage: node find_redundant_tests.js
 *
 * This script:
 * 1. Tests each test file by removing one test at a time
 * 2. Runs coverage check after each removal
 * 3. If coverage stays >= 100%, marks test as redundant
 * 4. Reports all findings in a clear format
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TESTS_DIR = path.join(__dirname, 'backend/tests/unmocked');
const BACKEND_DIR = path.join(__dirname, 'backend');

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function getCoverage() {
  try {
    const result = execSync('npm test -- --coverage --silent 2>&1', {
      cwd: BACKEND_DIR,
      encoding: 'utf8',
      timeout: 180000,
    });
    const match = result.match(/Statements\s+:\s+([\d.]+)%/);
    return match ? parseFloat(match[1]) : 0;
  } catch (e) {
    return 0;
  }
}

function extractTests(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const tests = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match it( or test(
    if (/^\s*(it|test)\s*\(\s*['"`]/.test(line)) {
      const match = line.match(/['"`]([^'"`]+)['"`]/);
      if (match) {
        // Find test end by counting braces
        let braceCount = 0;
        let foundOpen = false;
        let endLine = i;

        for (let j = i; j < lines.length; j++) {
          braceCount += (lines[j].match(/{/g) || []).length;
          braceCount -= (lines[j].match(/}/g) || []).length;

          if (braceCount > 0) foundOpen = true;
          if (foundOpen && braceCount === 0) {
            endLine = j;
            break;
          }
        }

        tests.push({
          name: match[1],
          startLine: i,
          endLine: endLine,
        });
      }
    }
  }

  return tests;
}

function removeTest(filePath, test) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Remove test lines
  const modified = [
    ...lines.slice(0, test.startLine),
    ...lines.slice(test.endLine + 1),
  ].join('\n');

  return modified;
}

function analyzeFile(filePath, fileName) {
  log(`\n📁 ${fileName}`, 'cyan');
  log('─'.repeat(70), 'cyan');

  const tests = extractTests(filePath);
  if (tests.length === 0) {
    log('  No tests found', 'yellow');
    return null;
  }

  const backup = filePath + '.backup_analysis';
  const originalContent = fs.readFileSync(filePath, 'utf8');

  const removable = [];
  const required = [];

  log(`  Testing ${tests.length} tests...`);

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const testNameShort = test.name.substring(0, 65);

    // Remove test
    const modified = removeTest(filePath, test);

    // Write modified version
    fs.writeFileSync(filePath, modified);

    try {
      // Check coverage
      const coverage = getCoverage();

      if (coverage >= 100.0) {
        removable.push({
          name: test.name,
          coverage: coverage,
        });
        log(
          `  [${i + 1}/${tests.length}] ✓ REDUNDANT: ${testNameShort}`,
          'green'
        );
      } else {
        required.push({
          name: test.name,
          coverage: coverage,
        });
        log(
          `  [${i + 1}/${tests.length}] ✗ REQUIRED (${coverage.toFixed(2)}%): ${testNameShort}`,
          'yellow'
        );
      }
    } catch (e) {
      log(`  [${i + 1}/${tests.length}] ⚠ ERROR: ${testNameShort}`, 'red');
      required.push({ name: test.name, coverage: 0 });
    } finally {
      // Restore original
      fs.writeFileSync(filePath, originalContent);
    }
  }

  return { removable, required, totalTests: tests.length };
}

// Main execution
log('\n' + '='.repeat(70), 'bold');
log('REDUNDANT TEST ANALYZER', 'bold');
log('='.repeat(70), 'bold');

const baselineCoverage = getCoverage();
log(`\nBaseline coverage: ${baselineCoverage.toFixed(2)}%\n`, 'cyan');

if (baselineCoverage < 100) {
  log(
    `⚠️  WARNING: Baseline coverage is ${baselineCoverage.toFixed(2)}%, not 100%`,
    'red'
  );
  log('Some test removals might show false positives.\n', 'red');
}

// Get all test files
const testFiles = fs
  .readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith('.unmocked.test.ts') && !f.includes('.bak'));

const results = {};
let totalRemovable = 0;

for (const file of testFiles) {
  const filePath = path.join(TESTS_DIR, file);
  const result = analyzeFile(filePath, file);
  if (result) {
    results[file] = result;
    totalRemovable += result.removable.length;
  }
}

// Summary
log('\n' + '='.repeat(70), 'bold');
log('SUMMARY', 'bold');
log('='.repeat(70), 'bold');

log(`\nTotal redundant tests found: ${totalRemovable}\n`, 'green');

let hasRemovable = false;
for (const [file, result] of Object.entries(results)) {
  if (result.removable.length > 0) {
    hasRemovable = true;
    log(`${file}:`, 'cyan');
    log(`  Removable: ${result.removable.length}/${result.totalTests}`, 'green');

    // Show first 5
    result.removable.slice(0, 5).forEach((test) => {
      log(`    • ${test.name.substring(0, 60)}`, 'green');
    });

    if (result.removable.length > 5) {
      log(
        `    ... and ${result.removable.length - 5} more`,
        'green'
      );
    }
  }
}

if (!hasRemovable) {
  log(
    '\nNo redundant tests found. All tests are required for 100% coverage.',
    'yellow'
  );
}

// Export results as JSON for easy parsing
const jsonOutput = {
  baselineCoverage,
  totalRedundantTests: totalRemovable,
  results,
  timestamp: new Date().toISOString(),
};

const outputFile = path.join(__dirname, 'redundant_tests_analysis.json');
fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
log(`\nDetailed results saved to: redundant_tests_analysis.json\n`, 'cyan');
