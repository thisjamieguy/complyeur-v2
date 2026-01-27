import { parseGanttFormat } from './parse';

/**
 * Previews what the parser sees for debugging.
 */
export function previewGanttParse(
  data: unknown[][],
  options: { referenceYear?: number } = {}
): {
  headers: Array<{ index: number; value: string; type: 'name' | 'date' | 'ignored' }>;
  sampleRows: Array<{ name: string; cells: Array<{ value: string; country: string | null }> }>;
} {
  const result = parseGanttFormat(data, options);
  const dateIndices = new Set(result.dateColumns.map((dc) => dc.index));

  const headers = (data[0] as unknown[]).map((h, i) => ({
    index: i,
    value: String(h ?? ''),
    type: (i === 0 ? 'name' : dateIndices.has(i) ? 'date' : 'ignored') as
      | 'name'
      | 'date'
      | 'ignored',
  }));

  const sampleRows = result.rows.slice(0, 5).map((row) => ({
    name: row.employeeName,
    cells: row.cells.map((cell) => ({
      value: cell.rawValue,
      country: cell.countryCode,
    })),
  }));

  return { headers, sampleRows };
}
