/**
 * Generate combined test report from Vitest coverage and Playwright results.
 *
 * Combines:
 * - Vitest coverage report (coverage/coverage-summary.json)
 * - Playwright results (playwright-report/results.json)
 *
 * Outputs: test-reports/combined-report.html
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'test-reports');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function formatPercent(value) {
  return typeof value === 'number' ? `${value.toFixed(1)}%` : 'N/A';
}

function getStatusClass(passed, total) {
  if (total === 0) return 'neutral';
  const ratio = passed / total;
  if (ratio === 1) return 'success';
  if (ratio >= 0.8) return 'warning';
  return 'error';
}

function getCoverageClass(pct) {
  if (pct >= 90) return 'success';
  if (pct >= 80) return 'warning';
  return 'error';
}

function generateReport() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read coverage summary
  const coveragePath = path.join(ROOT, 'coverage', 'coverage-summary.json');
  const coverage = readJsonSafe(coveragePath);

  // Read Playwright results
  const playwrightPath = path.join(ROOT, 'playwright-report', 'results.json');
  const playwright = readJsonSafe(playwrightPath);

  // Calculate stats
  let vitestStats = { passed: 0, failed: 0, skipped: 0, total: 0 };
  let e2eStats = { passed: 0, failed: 0, skipped: 0, total: 0 };

  if (playwright && playwright.suites) {
    const countTests = (suites) => {
      for (const suite of suites) {
        if (suite.specs) {
          for (const spec of suite.specs) {
            for (const test of spec.tests || []) {
              e2eStats.total++;
              const status = test.status || test.results?.[0]?.status;
              if (status === 'passed' || status === 'expected') e2eStats.passed++;
              else if (status === 'skipped') e2eStats.skipped++;
              else e2eStats.failed++;
            }
          }
        }
        if (suite.suites) countTests(suite.suites);
      }
    };
    countTests(playwright.suites);
  }

  // Coverage stats
  const totalCoverage = coverage?.total || {};
  const lines = totalCoverage.lines?.pct || 0;
  const branches = totalCoverage.branches?.pct || 0;
  const functions = totalCoverage.functions?.pct || 0;
  const statements = totalCoverage.statements?.pct || 0;

  // Compliance-specific coverage
  let complianceCoverage = { lines: 0, branches: 0, functions: 0, statements: 0 };
  if (coverage) {
    const complianceFiles = Object.keys(coverage).filter(
      (k) => k.includes('lib/compliance/') && k !== 'total'
    );
    if (complianceFiles.length > 0) {
      let totals = { lines: 0, branches: 0, functions: 0, statements: 0 };
      let covered = { lines: 0, branches: 0, functions: 0, statements: 0 };
      for (const file of complianceFiles) {
        const data = coverage[file];
        totals.lines += data.lines?.total || 0;
        totals.branches += data.branches?.total || 0;
        totals.functions += data.functions?.total || 0;
        totals.statements += data.statements?.total || 0;
        covered.lines += data.lines?.covered || 0;
        covered.branches += data.branches?.covered || 0;
        covered.functions += data.functions?.covered || 0;
        covered.statements += data.statements?.covered || 0;
      }
      complianceCoverage.lines = totals.lines > 0 ? (covered.lines / totals.lines) * 100 : 0;
      complianceCoverage.branches = totals.branches > 0 ? (covered.branches / totals.branches) * 100 : 0;
      complianceCoverage.functions = totals.functions > 0 ? (covered.functions / totals.functions) * 100 : 0;
      complianceCoverage.statements = totals.statements > 0 ? (covered.statements / totals.statements) * 100 : 0;
    }
  }

  const timestamp = new Date().toISOString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ComplyEUR Test Report</title>
  <style>
    :root {
      --success: #22c55e;
      --warning: #f59e0b;
      --error: #ef4444;
      --neutral: #6b7280;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #1e293b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      line-height: 1.5;
    }
    h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; }
    .timestamp { color: var(--neutral); margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card {
      background: var(--card);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card h2 { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; }
    .metric { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: var(--neutral); }
    .metric-value { font-weight: 600; }
    .success { color: var(--success); }
    .warning { color: var(--warning); }
    .error { color: var(--error); }
    .neutral { color: var(--neutral); }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .badge.success { background: #dcfce7; color: #166534; }
    .badge.warning { background: #fef3c7; color: #92400e; }
    .badge.error { background: #fee2e2; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    th { font-weight: 600; color: var(--neutral); font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>ComplyEUR Test Report</h1>
  <p class="timestamp">Generated: ${timestamp}</p>

  <div class="grid">
    <div class="card">
      <h2>Unit/Integration Tests</h2>
      <div class="metric">
        <span class="metric-label">Status</span>
        <span class="badge ${coverage ? 'success' : 'neutral'}">${coverage ? 'Coverage Available' : 'No Data'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Line Coverage</span>
        <span class="metric-value ${getCoverageClass(lines)}">${formatPercent(lines)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Branch Coverage</span>
        <span class="metric-value ${getCoverageClass(branches)}">${formatPercent(branches)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Function Coverage</span>
        <span class="metric-value ${getCoverageClass(functions)}">${formatPercent(functions)}</span>
      </div>
    </div>

    <div class="card">
      <h2>Compliance Library Coverage</h2>
      <div class="metric">
        <span class="metric-label">Target</span>
        <span class="badge ${complianceCoverage.lines >= 90 ? 'success' : 'warning'}">90%+</span>
      </div>
      <div class="metric">
        <span class="metric-label">Lines</span>
        <span class="metric-value ${getCoverageClass(complianceCoverage.lines)}">${formatPercent(complianceCoverage.lines)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Branches</span>
        <span class="metric-value ${getCoverageClass(complianceCoverage.branches)}">${formatPercent(complianceCoverage.branches)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Functions</span>
        <span class="metric-value ${getCoverageClass(complianceCoverage.functions)}">${formatPercent(complianceCoverage.functions)}</span>
      </div>
    </div>

    <div class="card">
      <h2>E2E Tests (Playwright)</h2>
      <div class="metric">
        <span class="metric-label">Status</span>
        <span class="badge ${getStatusClass(e2eStats.passed, e2eStats.total)}">${e2eStats.total > 0 ? `${e2eStats.passed}/${e2eStats.total} Passed` : 'No Data'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Passed</span>
        <span class="metric-value success">${e2eStats.passed}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Failed</span>
        <span class="metric-value ${e2eStats.failed > 0 ? 'error' : ''}">${e2eStats.failed}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Skipped</span>
        <span class="metric-value neutral">${e2eStats.skipped}</span>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Success Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Target</th>
          <th>Actual</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Overall Coverage</td>
          <td>80%+</td>
          <td>${formatPercent(lines)}</td>
          <td><span class="badge ${lines >= 80 ? 'success' : 'warning'}">${lines >= 80 ? 'Pass' : 'Below Target'}</span></td>
        </tr>
        <tr>
          <td>Compliance Lib Coverage</td>
          <td>90%+</td>
          <td>${formatPercent(complianceCoverage.lines)}</td>
          <td><span class="badge ${complianceCoverage.lines >= 90 ? 'success' : 'warning'}">${complianceCoverage.lines >= 90 ? 'Pass' : 'Below Target'}</span></td>
        </tr>
        <tr>
          <td>E2E Pass Rate</td>
          <td>100%</td>
          <td>${e2eStats.total > 0 ? formatPercent((e2eStats.passed / e2eStats.total) * 100) : 'N/A'}</td>
          <td><span class="badge ${e2eStats.failed === 0 && e2eStats.total > 0 ? 'success' : e2eStats.total === 0 ? 'neutral' : 'error'}">${e2eStats.failed === 0 && e2eStats.total > 0 ? 'Pass' : e2eStats.total === 0 ? 'No Tests' : 'Failures'}</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <p style="margin-top: 2rem; color: var(--neutral); font-size: 0.875rem;">
    View detailed reports: <a href="../coverage/index.html">Coverage Report</a> | <a href="../playwright-report/index.html">Playwright Report</a>
  </p>
</body>
</html>`;

  const outputPath = path.join(OUTPUT_DIR, 'combined-report.html');
  fs.writeFileSync(outputPath, html);
  console.log(`Report generated: ${outputPath}`);
}

generateReport();
