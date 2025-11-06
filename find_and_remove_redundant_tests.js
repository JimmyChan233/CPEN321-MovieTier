#!/usr/bin/env node
/**
 * Find and Remove Redundant Tests - Iterative Approach (All Backend Tests)
 * Usage: node find_and_remove_redundant_tests.js
 *
 * This script:
 * 1. Tests each test individually across ALL backend test directories
 * 2. If a test is redundant, REMOVES IT PERMANENTLY
 * 3. Tests the next test against the REDUCED baseline
 * 4. Continues until no more redundant tests found
 * 5. Maintains 100% coverage throughout
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TESTS_ROOT = path.join(__dirname, 'backend/tests');
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

function removeTestFromFile(filePath, test) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Remove test lines
  const modified = [
    ...lines.slice(0, test.startLine),
    ...lines.slice(test.endLine + 1),
  ].join('\n');

  fs.writeFileSync(filePath, modified);
  return modified;
}

function analyzeFileIteratively(filePath, fileName) {
  log(`\n📁 ${fileName}`, 'cyan');
  log('─'.repeat(70), 'cyan');

  let tests = extractTests(filePath);
  if (tests.length === 0) {
    log('  No tests found', 'yellow');
    return { removed: [], kept: tests.length };
  }

  const removed = [];
  let testIndex = 0;

  while (testIndex < tests.length) {
    const test = tests[testIndex];
    const testNameShort = test.name.substring(0, 60);

    // Save original content
    const originalContent = fs.readFileSync(filePath, 'utf8');

    // Remove test from file
    removeTestFromFile(filePath, test);

    try {
      // Check coverage
      const coverage = getCoverage();

      if (coverage >= 100.0) {
        // Test is REDUNDANT - keep it removed permanently
        log(
          `  ✓ REMOVED [${testIndex + 1}/${tests.length}]: ${testNameShort}`,
          'green'
        );
        removed.push(test.name);

        // Re-extract tests (line numbers changed after removal)
        tests = extractTests(filePath);
        // Don't increment testIndex, test the next test at same position
      } else {
        // Test is REQUIRED - restore it
        log(
          `  ✗ KEPT [${testIndex + 1}/${tests.length}]: ${testNameShort} (coverage: ${coverage.toFixed(2)}%)`,
          'yellow'
        );
        fs.writeFileSync(filePath, originalContent);

        // Re-extract tests with original content
        tests = extractTests(filePath);
        testIndex++;
      }
    } catch (e) {
      log(
        `  ⚠ ERROR [${testIndex + 1}/${tests.length}]: ${testNameShort}`,
        'red'
      );
      // Restore on error
      fs.writeFileSync(filePath, originalContent);
      tests = extractTests(filePath);
      testIndex++;
    }
  }

  return { removed, kept: tests.length };
}

// Main execution
log('\n' + '='.repeat(70), 'bold');
log('REDUNDANT TEST REMOVER - ITERATIVE APPROACH', 'bold');
log('='.repeat(70), 'bold');

const baselineCoverage = getCoverage();
log(`\nInitial baseline coverage: ${baselineCoverage.toFixed(2)}%\n`, 'cyan');

if (baselineCoverage < 100) {
  log(
    `⚠️  WARNING: Baseline coverage is ${baselineCoverage.toFixed(2)}%, not 100%`,
    'red'
  );
  log('This script requires 100% baseline coverage.\n', 'red');
  process.exit(1);
}

// Recursively find all test files
function getAllTestFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllTestFiles(filePath, fileList);
    } else if ((file.endsWith('.test.ts') || file.endsWith('.test.js')) && !file.includes('.bak')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

// Get all test files from all directories
const testFilePaths = getAllTestFiles(TESTS_ROOT).sort();

log(`\nFound ${testFilePaths.length} test files across all directories\n`, 'cyan');

const results = {};
let totalRemoved = 0;
let totalKept = 0;

for (const filePath of testFilePaths) {
  const relativePath = path.relative(TESTS_ROOT, filePath);
  const result = analyzeFileIteratively(filePath, relativePath);
  if (result.removed.length > 0 || result.kept > 0) {
    results[relativePath] = result;
    totalRemoved += result.removed.length;
    totalKept += result.kept;
  }
}

// Final coverage check
log(`\n${'='.repeat(70)}`, 'bold');
log('FINAL COVERAGE CHECK', 'bold');
log(`${'='.repeat(70)}`, 'bold');

const finalCoverage = getCoverage();
log(`\nFinal coverage: ${finalCoverage.toFixed(2)}%\n`, 'cyan');

if (finalCoverage >= 100.0) {
  log('✓ SUCCESS: 100% coverage maintained!', 'green');
} else {
  log(
    `✗ ERROR: Coverage dropped to ${finalCoverage.toFixed(2)}%`,
    'red'
  );
  log('Some tests may have been incorrectly removed!', 'red');
  process.exit(1);
}

// Summary
log('\n' + '='.repeat(70), 'bold');
log('SUMMARY', 'bold');
log('='.repeat(70), 'bold');

log(`\nTotal tests removed: ${totalRemoved}`, 'green');
log(`Total tests kept: ${totalKept}\n`, 'yellow');

for (const [file, result] of Object.entries(results)) {
  if (result.removed.length > 0) {
    log(`${file}:`, 'cyan');
    log(`  Removed: ${result.removed.length}`, 'green');
    result.removed.slice(0, 5).forEach((test) => {
      log(`    ✓ ${test.substring(0, 60)}`, 'green');
    });
    if (result.removed.length > 5) {
      log(
        `    ... and ${result.removed.length - 5} more`,
        'green'
      );
    }
  }
}

// Export results
const jsonOutput = {
  baselineCoverage,
  finalCoverage,
  totalRemoved,
  totalKept,
  results,
  timestamp: new Date().toISOString(),
};

const outputFile = path.join(__dirname, 'redundant_tests_removed.json');
fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
log(
  `\nDetailed results saved to: redundant_tests_removed.json\n`,
  'cyan'
);
