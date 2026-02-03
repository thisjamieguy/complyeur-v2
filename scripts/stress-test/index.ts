/**
 * @fileoverview Main runner for stress test suite.
 *
 * Orchestrates the complete stress test workflow:
 * 1. Generate test data with known expected values
 * 2. Insert data into database
 * 3. Fetch actual values from database
 * 4. Compare expected vs actual
 * 5. Generate reports
 *
 * Usage:
 *   npx tsx scripts/stress-test/index.ts
 *
 * Or with npm script:
 *   npm run stress-test
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { generateStressTestData } from './generate-trips';
import { insertStressTestData } from './insert-data';
import { fetchActualValues } from './fetch-actual';
import { compareValues, generateHtmlReport, generateJsonReport } from './generate-report';
import { DEFAULT_CONFIG } from './constants';
import { formatNumber, formatDuration } from './utils';
import type { GeneratorConfig } from './types';

/**
 * Main stress test runner.
 */
async function runStressTest() {
  const totalStartTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          COMPLYEUR TRIP IMPORT STRESS TEST                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Parse command line arguments for custom config
  const config: GeneratorConfig = { ...DEFAULT_CONFIG };

  // Check for --days argument
  const daysArg = process.argv.find(arg => arg.startsWith('--days='));
  if (daysArg) {
    config.targetTotalDays = parseInt(daysArg.split('=')[1], 10);
  }

  // Check for --employees argument
  const employeesArg = process.argv.find(arg => arg.startsWith('--employees='));
  if (employeesArg) {
    config.employeeCount = parseInt(employeesArg.split('=')[1], 10);
  }

  // Check for --seed argument
  const seedArg = process.argv.find(arg => arg.startsWith('--seed='));
  if (seedArg) {
    config.seed = parseInt(seedArg.split('=')[1], 10);
  }

  // Check for --dry-run (skip database operations)
  const dryRun = process.argv.includes('--dry-run');

  console.log('Configuration:');
  console.log(`  Seed: ${config.seed}`);
  console.log(`  Target days: ${formatNumber(config.targetTotalDays)}`);
  console.log(`  Employees: ${formatNumber(config.employeeCount)}`);
  console.log(`  Schengen ratio: ${(config.schengenRatio * 100).toFixed(0)}%`);
  console.log(`  Date range: ${config.startDate} to ${config.endDate}`);
  console.log(`  Trip days: ${config.minTripDays} - ${config.maxTripDays}`);
  if (dryRun) {
    console.log(`  Mode: DRY RUN (no database operations)`);
  }
  console.log('');

  // Step 1: Generate test data
  console.log('========================================');
  console.log('STEP 1: GENERATING TEST DATA');
  console.log('========================================');

  const genStartTime = Date.now();
  const { trips, employees, expected, metadata } = generateStressTestData(config);
  const generationMs = Date.now() - genStartTime;

  console.log(`\nGeneration complete in ${formatDuration(generationMs)}`);
  console.log(`  Trips: ${formatNumber(metadata.totalTrips)}`);
  console.log(`  Days: ${formatNumber(metadata.totalDays)}`);
  console.log(`  Countries: ${metadata.countriesUsed}`);

  if (dryRun) {
    console.log('\n========================================');
    console.log('DRY RUN - SKIPPING DATABASE OPERATIONS');
    console.log('========================================');
    console.log('\nExpected values calculated:');
    console.log(`  Total trips: ${formatNumber(expected.totalTrips)}`);
    console.log(`  Total raw days: ${formatNumber(expected.totalRawDays)}`);
    console.log(`  Schengen raw days: ${formatNumber(expected.schengenRawDays)}`);
    console.log(`  Non-Schengen raw days: ${formatNumber(expected.nonSchengenRawDays)}`);
    console.log(`  Unique Schengen days: ${formatNumber(expected.uniqueSchengenDays)}`);
    console.log(`  Unique non-Schengen days: ${formatNumber(expected.uniqueNonSchengenDays)}`);
    console.log('\nEdge cases:');
    console.log(`  Same-day trips: ${formatNumber(expected.edgeCases.sameDayTrips)}`);
    console.log(`  Year-spanning: ${formatNumber(expected.edgeCases.yearSpanningTrips)}`);
    console.log(`  Leap year days: ${formatNumber(expected.edgeCases.leapYearTrips)}`);
    console.log(`  Overlapping pairs: ${formatNumber(expected.edgeCases.overlappingTripPairs)}`);
    console.log('\nTo run full test with database, remove --dry-run flag');
    return;
  }

  // Step 2: Insert data into database
  console.log('\n========================================');
  console.log('STEP 2: INSERTING DATA INTO DATABASE');
  console.log('========================================');

  const insertStartTime = Date.now();
  const insertResult = await insertStressTestData(employees, trips, true);
  const insertionMs = Date.now() - insertStartTime;

  if (insertResult.tripsCreated !== trips.length) {
    console.warn(`\nWarning: Only ${insertResult.tripsCreated}/${trips.length} trips were inserted`);
  }

  // Step 3: Fetch actual values from database
  console.log('\n========================================');
  console.log('STEP 3: FETCHING ACTUAL VALUES');
  console.log('========================================');

  const fetchStartTime = Date.now();
  const actual = await fetchActualValues(insertResult.companyId);
  const fetchMs = Date.now() - fetchStartTime;

  // Step 4: Compare and generate report
  console.log('\n========================================');
  console.log('STEP 4: COMPARING AND GENERATING REPORT');
  console.log('========================================');

  const report = compareValues(expected, actual, config, {
    generationMs,
    insertionMs,
    fetchMs,
  });

  // Ensure output directory exists
  const outputDir = join(process.cwd(), 'stress-test-output');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Generate reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const htmlPath = join(outputDir, `stress-test-report-${timestamp}.html`);
  const jsonPath = join(outputDir, `stress-test-report-${timestamp}.json`);

  generateHtmlReport(report, expected, actual, htmlPath);
  generateJsonReport(report, expected, jsonPath);

  // Also create a "latest" symlink/copy for convenience
  const latestHtmlPath = join(outputDir, 'stress-test-report-latest.html');
  const latestJsonPath = join(outputDir, 'stress-test-report-latest.json');
  generateHtmlReport(report, expected, actual, latestHtmlPath);
  generateJsonReport(report, expected, latestJsonPath);

  // Final summary
  const totalDurationMs = Date.now() - totalStartTime;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    STRESS TEST COMPLETE                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Summary:');
  console.log(`  Status: ${report.passed ? 'ALL TESTS PASSED' : `${report.discrepancies.length} DISCREPANCIES FOUND`}`);
  console.log(`  Trips: ${formatNumber(report.tripsGenerated)} generated, ${formatNumber(report.tripsInserted)} inserted`);
  console.log(`  Total duration: ${formatDuration(totalDurationMs)}`);
  console.log('');
  console.log('Reports:');
  console.log(`  HTML: ${htmlPath}`);
  console.log(`  JSON: ${jsonPath}`);
  console.log('');

  // Exit with error code if tests failed
  if (!report.passed) {
    process.exit(1);
  }
}

// Run the stress test
runStressTest().catch(error => {
  console.error('\nStress test failed with error:');
  console.error(error);
  process.exit(1);
});
