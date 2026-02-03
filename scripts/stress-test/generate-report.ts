/**
 * @fileoverview Report generation for stress test results.
 *
 * Compares expected vs actual values and generates
 * comprehensive HTML and JSON reports.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { formatNumber, formatDuration } from './utils';
import { COUNTRY_NAMES, SCHENGEN_SET } from './constants';
import type {
  ExpectedValues,
  ActualValues,
  ValidationReport,
  MetricComparison,
  Discrepancy,
  GeneratorConfig,
} from './types';

/**
 * Compares expected and actual values and generates a validation report.
 *
 * @param expected - Expected values from generator
 * @param actual - Actual values from database
 * @param config - Generator configuration
 * @param timings - Timing information
 * @returns Validation report
 */
export function compareValues(
  expected: ExpectedValues,
  actual: ActualValues,
  config: GeneratorConfig,
  timings: {
    generationMs: number;
    insertionMs: number;
    fetchMs: number;
  }
): ValidationReport {
  console.log('\n========================================');
  console.log('COMPARING EXPECTED VS ACTUAL VALUES');
  console.log('========================================');

  const metrics: MetricComparison[] = [];
  const discrepancies: Discrepancy[] = [];

  // Helper to add metric comparison
  function addMetric(name: string, expectedVal: number, actualVal: number) {
    const passed = expectedVal === actualVal;
    const difference = actualVal - expectedVal;
    metrics.push({ name, expected: expectedVal, actual: actualVal, passed, difference });

    if (!passed) {
      discrepancies.push({
        type: 'count',
        entity: 'global',
        metric: name,
        expected: expectedVal,
        actual: actualVal,
        difference,
      });
    }

    const status = passed ? 'PASS' : 'FAIL';
    console.log(`  ${name}: ${formatNumber(expectedVal)} vs ${formatNumber(actualVal)} [${status}]`);
  }

  // Compare global metrics
  console.log('\nGlobal Metrics:');
  addMetric('Total Trips', expected.totalTrips, actual.totalTrips);
  addMetric('Total Raw Days', expected.totalRawDays, actual.totalRawDays);
  addMetric('Schengen Raw Days', expected.schengenRawDays, actual.schengenRawDays);
  addMetric('Non-Schengen Raw Days', expected.nonSchengenRawDays, actual.nonSchengenRawDays);
  addMetric('Unique Schengen Days', expected.uniqueSchengenDays, actual.uniqueSchengenDays);
  addMetric('Unique Non-Schengen Days', expected.uniqueNonSchengenDays, actual.uniqueNonSchengenDays);

  // Compare per-country metrics
  console.log('\nPer-Country Comparison (sample):');
  let countryMatches = 0;
  let countryMismatches = 0;

  for (const [code, expectedCountry] of expected.perCountry) {
    const actualCountry = actual.perCountry.get(code);

    if (!actualCountry) {
      discrepancies.push({
        type: 'count',
        entity: `country:${code}`,
        metric: 'trips',
        expected: expectedCountry.trips,
        actual: 0,
        difference: -expectedCountry.trips,
      });
      countryMismatches++;
      continue;
    }

    if (expectedCountry.trips === actualCountry.trips && expectedCountry.rawDays === actualCountry.rawDays) {
      countryMatches++;
    } else {
      countryMismatches++;
      if (expectedCountry.trips !== actualCountry.trips) {
        discrepancies.push({
          type: 'count',
          entity: `country:${code}`,
          metric: 'trips',
          expected: expectedCountry.trips,
          actual: actualCountry.trips,
          difference: actualCountry.trips - expectedCountry.trips,
        });
      }
      if (expectedCountry.rawDays !== actualCountry.rawDays) {
        discrepancies.push({
          type: 'days',
          entity: `country:${code}`,
          metric: 'rawDays',
          expected: expectedCountry.rawDays,
          actual: actualCountry.rawDays,
          difference: actualCountry.rawDays - expectedCountry.rawDays,
        });
      }
    }
  }
  console.log(`  Countries matched: ${countryMatches}/${expected.perCountry.size}`);

  // Compare per-employee metrics (sample)
  console.log('\nPer-Employee Comparison (sample):');
  let employeeMatches = 0;
  let employeeMismatches = 0;

  // Build map by email for actual values
  const actualByEmail = new Map<string, typeof actual.perEmployee extends Map<string, infer V> ? V : never>();
  for (const empData of actual.perEmployee.values()) {
    if (empData.email) {
      actualByEmail.set(empData.email, empData);
    }
  }

  for (const [email, expectedEmp] of expected.perEmployee) {
    const actualEmp = actualByEmail.get(email);

    if (!actualEmp) {
      discrepancies.push({
        type: 'count',
        entity: `employee:${email}`,
        metric: 'trips',
        expected: expectedEmp.totalTrips,
        actual: 0,
        difference: -expectedEmp.totalTrips,
      });
      employeeMismatches++;
      continue;
    }

    const tripsMatch = expectedEmp.totalTrips === actualEmp.totalTrips;
    const daysMatch = expectedEmp.uniqueSchengenDays === actualEmp.uniqueSchengenDays;

    if (tripsMatch && daysMatch) {
      employeeMatches++;
    } else {
      employeeMismatches++;
      if (!tripsMatch) {
        discrepancies.push({
          type: 'count',
          entity: `employee:${email}`,
          metric: 'trips',
          expected: expectedEmp.totalTrips,
          actual: actualEmp.totalTrips,
          difference: actualEmp.totalTrips - expectedEmp.totalTrips,
        });
      }
      if (!daysMatch) {
        discrepancies.push({
          type: 'deduplication',
          entity: `employee:${email}`,
          metric: 'uniqueSchengenDays',
          expected: expectedEmp.uniqueSchengenDays,
          actual: actualEmp.uniqueSchengenDays,
          difference: actualEmp.uniqueSchengenDays - expectedEmp.uniqueSchengenDays,
        });
      }
    }
  }
  console.log(`  Employees matched: ${employeeMatches}/${expected.perEmployee.size}`);

  const passed = discrepancies.length === 0;
  const totalDurationMs = timings.generationMs + timings.insertionMs + timings.fetchMs;

  console.log(`\n========================================`);
  console.log(`RESULT: ${passed ? 'ALL TESTS PASSED' : `${discrepancies.length} DISCREPANCIES FOUND`}`);
  console.log(`========================================`);

  return {
    testName: 'stress-test-import',
    timestamp: new Date().toISOString(),
    config,
    tripsGenerated: expected.totalTrips,
    tripsInserted: actual.totalTrips,
    importSuccessRate: actual.totalTrips / expected.totalTrips,
    metrics,
    discrepancies,
    passed,
    generationDurationMs: timings.generationMs,
    insertionDurationMs: timings.insertionMs,
    calculationDurationMs: timings.fetchMs,
    totalDurationMs,
  };
}

/**
 * Generates an HTML report from the validation results.
 *
 * @param report - Validation report
 * @param expected - Expected values
 * @param actual - Actual values
 * @param outputPath - Path to write the report
 */
export function generateHtmlReport(
  report: ValidationReport,
  expected: ExpectedValues,
  actual: ActualValues,
  outputPath: string
): void {
  const statusClass = report.passed ? 'pass' : 'fail';
  const statusText = report.passed ? 'ALL TESTS PASSED' : `${report.discrepancies.length} DISCREPANCIES`;

  // Build metrics table rows
  const metricsRows = report.metrics
    .map(m => {
      const status = m.passed ? 'pass' : 'fail';
      const diff = m.difference !== 0 ? ` (${m.difference > 0 ? '+' : ''}${formatNumber(m.difference)})` : '';
      return `
        <tr class="${status}">
          <td>${m.name}</td>
          <td class="number">${formatNumber(m.expected)}</td>
          <td class="number">${formatNumber(m.actual)}${diff}</td>
          <td class="status">${m.passed ? 'PASS' : 'FAIL'}</td>
        </tr>`;
    })
    .join('');

  // Build country table rows (sorted by trips desc)
  const sortedCountries = Array.from(expected.perCountry.entries())
    .sort((a, b) => b[1].trips - a[1].trips);

  const countryRows = sortedCountries
    .map(([code, exp]) => {
      const act = actual.perCountry.get(code);
      const tripsMatch = act && exp.trips === act.trips;
      const daysMatch = act && exp.rawDays === act.rawDays;
      const status = tripsMatch && daysMatch ? 'pass' : 'fail';
      const type = SCHENGEN_SET.has(code) ? 'Schengen' : 'Non-Schengen';
      const name = COUNTRY_NAMES[code] || code;

      return `
        <tr class="${status}">
          <td>${code}</td>
          <td>${name}</td>
          <td>${type}</td>
          <td class="number">${formatNumber(exp.trips)}</td>
          <td class="number">${act ? formatNumber(act.trips) : '-'}</td>
          <td class="number">${formatNumber(exp.rawDays)}</td>
          <td class="number">${act ? formatNumber(act.rawDays) : '-'}</td>
          <td class="status">${status === 'pass' ? 'PASS' : 'FAIL'}</td>
        </tr>`;
    })
    .join('');

  // Build discrepancies rows
  const discrepancyRows = report.discrepancies.length === 0
    ? '<tr><td colspan="5" class="none">No discrepancies found</td></tr>'
    : report.discrepancies
        .map(d => `
          <tr class="fail">
            <td>${d.type}</td>
            <td>${d.entity}</td>
            <td>${d.metric}</td>
            <td class="number">${formatNumber(d.expected)}</td>
            <td class="number">${formatNumber(d.actual)} (${d.difference > 0 ? '+' : ''}${formatNumber(d.difference)})</td>
          </tr>`)
        .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stress Test Report - ${report.timestamp}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f5f5f5;
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin: 24px 0 12px; color: #333; }
    .timestamp { color: #666; font-size: 14px; margin-bottom: 24px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card h3 { font-size: 14px; color: #666; margin-bottom: 4px; }
    .card .value { font-size: 24px; font-weight: 600; }
    .status-banner {
      padding: 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      text-align: center;
      margin-bottom: 24px;
    }
    .status-banner.pass { background: #d4edda; color: #155724; }
    .status-banner.fail { background: #f8d7da; color: #721c24; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th { background: #f8f9fa; font-weight: 600; }
    td.number { text-align: right; font-variant-numeric: tabular-nums; }
    td.status { font-weight: 600; }
    tr.pass td.status { color: #155724; }
    tr.fail td.status { color: #721c24; }
    tr.fail { background: #fff5f5; }
    td.none { text-align: center; color: #666; font-style: italic; }
    .edge-cases { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .edge-case { background: white; padding: 12px; border-radius: 8px; text-align: center; }
    .edge-case .label { font-size: 12px; color: #666; }
    .edge-case .value { font-size: 20px; font-weight: 600; }
    .timings { display: flex; gap: 24px; margin-bottom: 24px; }
    .timing { font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <h1>Trip Import Stress Test Report</h1>
  <div class="timestamp">${report.timestamp}</div>

  <div class="status-banner ${statusClass}">${statusText}</div>

  <div class="summary">
    <div class="card">
      <h3>Trips Generated</h3>
      <div class="value">${formatNumber(report.tripsGenerated)}</div>
    </div>
    <div class="card">
      <h3>Trips Inserted</h3>
      <div class="value">${formatNumber(report.tripsInserted)}</div>
    </div>
    <div class="card">
      <h3>Success Rate</h3>
      <div class="value">${(report.importSuccessRate * 100).toFixed(1)}%</div>
    </div>
    <div class="card">
      <h3>Discrepancies</h3>
      <div class="value">${report.discrepancies.length}</div>
    </div>
  </div>

  <div class="timings">
    <div class="timing">Generation: ${formatDuration(report.generationDurationMs)}</div>
    <div class="timing">Insertion: ${formatDuration(report.insertionDurationMs)}</div>
    <div class="timing">Validation: ${formatDuration(report.calculationDurationMs)}</div>
    <div class="timing">Total: ${formatDuration(report.totalDurationMs)}</div>
  </div>

  <h2>Configuration</h2>
  <table>
    <tr><th>Parameter</th><th>Value</th></tr>
    <tr><td>Seed</td><td>${report.config.seed}</td></tr>
    <tr><td>Target Days</td><td>${formatNumber(report.config.targetTotalDays)}</td></tr>
    <tr><td>Employees</td><td>${formatNumber(report.config.employeeCount)}</td></tr>
    <tr><td>Schengen Ratio</td><td>${(report.config.schengenRatio * 100).toFixed(0)}%</td></tr>
    <tr><td>Date Range</td><td>${report.config.startDate} to ${report.config.endDate}</td></tr>
    <tr><td>Trip Days Range</td><td>${report.config.minTripDays} - ${report.config.maxTripDays}</td></tr>
  </table>

  <h2>Metrics Comparison</h2>
  <table>
    <thead>
      <tr><th>Metric</th><th>Expected</th><th>Actual</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${metricsRows}
    </tbody>
  </table>

  <h2>Edge Cases</h2>
  <div class="edge-cases">
    <div class="edge-case">
      <div class="value">${formatNumber(expected.edgeCases.sameDayTrips)}</div>
      <div class="label">Same-Day Trips</div>
    </div>
    <div class="edge-case">
      <div class="value">${formatNumber(expected.edgeCases.yearSpanningTrips)}</div>
      <div class="label">Year-Spanning</div>
    </div>
    <div class="edge-case">
      <div class="value">${formatNumber(expected.edgeCases.leapYearTrips)}</div>
      <div class="label">Leap Year Days</div>
    </div>
    <div class="edge-case">
      <div class="value">${formatNumber(expected.edgeCases.overlappingTripPairs)}</div>
      <div class="label">Overlapping Pairs</div>
    </div>
  </div>

  <h2>Country Distribution (${expected.perCountry.size} countries)</h2>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Country</th>
        <th>Type</th>
        <th>Expected Trips</th>
        <th>Actual Trips</th>
        <th>Expected Days</th>
        <th>Actual Days</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${countryRows}
    </tbody>
  </table>

  <h2>Discrepancies</h2>
  <table>
    <thead>
      <tr><th>Type</th><th>Entity</th><th>Metric</th><th>Expected</th><th>Actual</th></tr>
    </thead>
    <tbody>
      ${discrepancyRows}
    </tbody>
  </table>

</body>
</html>`;

  writeFileSync(outputPath, html);
  console.log(`\nHTML report written to: ${outputPath}`);
}

/**
 * Generates a JSON report from the validation results.
 *
 * @param report - Validation report
 * @param expected - Expected values
 * @param outputPath - Path to write the report
 */
export function generateJsonReport(
  report: ValidationReport,
  expected: ExpectedValues,
  outputPath: string
): void {
  const json = {
    ...report,
    edgeCases: expected.edgeCases,
    perCountry: Object.fromEntries(expected.perCountry),
    perEmployee: Object.fromEntries(
      Array.from(expected.perEmployee.entries()).slice(0, 10) // Sample only
    ),
  };

  writeFileSync(outputPath, JSON.stringify(json, null, 2));
  console.log(`JSON report written to: ${outputPath}`);
}
