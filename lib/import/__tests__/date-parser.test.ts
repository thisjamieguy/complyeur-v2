import { describe, expect, it } from 'vitest';
import { parseDate } from '../date-parser';

describe('parseDate for gantt headers', () => {
  it('parses full-year gantt headers with day names', () => {
    const result = parseDate('Tue 04 Mar 2025', {
      isGanttHeader: true,
      referenceYear: 2026,
    });

    expect(result.date).toBe('2025-03-04');
    expect(result.format).toBe('GANTT_HEADER');
    expect(result.confidence).toBe('high');
  });

  it('parses full-year gantt headers without day names', () => {
    const result = parseDate('04 Mar 2025', {
      isGanttHeader: true,
      referenceYear: 2026,
    });

    expect(result.date).toBe('2025-03-04');
    expect(result.confidence).toBe('high');
  });

  it('keeps supporting short-form gantt headers without a year', () => {
    const result = parseDate('Mon 06 Jan', {
      isGanttHeader: true,
      referenceYear: 2025,
    });

    expect(result.date).toBe('2025-01-06');
    expect(result.warning).toContain('assumed 2025');
  });

  it('parses weekend gantt headers correctly', () => {
    const saturday = parseDate('Sat 08 Mar 2025', {
      isGanttHeader: true,
      referenceYear: 2026,
    });
    const sunday = parseDate('Sun 09 Mar 2025', {
      isGanttHeader: true,
      referenceYear: 2026,
    });

    expect(saturday.date).toBe('2025-03-08');
    expect(sunday.date).toBe('2025-03-09');
  });
});
