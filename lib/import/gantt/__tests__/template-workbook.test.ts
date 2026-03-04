import { Buffer } from 'node:buffer';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GANTT_TEMPLATE_OPTIONS,
  buildGanttTemplateDates,
  generateGanttTemplateWorkbook,
  getGanttTemplateBounds,
} from '../template-workbook';

describe('generateGanttTemplateWorkbook', () => {
  it('creates a three-sheet workbook with daily headers and blank employee rows', async () => {
    const anchorDate = new Date(2026, 2, 4);
    const { blob, filename } = await generateGanttTemplateWorkbook({
      anchorDate,
      ...DEFAULT_GANTT_TEMPLATE_OPTIONS,
    });

    const workbook = await loadWorkbook(blob);
    const templateSheet = workbook.getWorksheet('Template');

    expect(filename).toBe('complyeur_gantt_template_2026-03-04_00-00-00.xlsx');
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Template',
      'ISO Country Codes',
      'Example & Instructions',
    ]);
    expect(templateSheet).toBeDefined();
    expect(templateSheet?.getCell('A1').value).toBe('Employee');
    expect(getHeaderValues(templateSheet ?? workbook.worksheets[0])).toContain('Sat 08 Mar 2025');
    expect(getHeaderValues(templateSheet ?? workbook.worksheets[0])).toContain('Sun 09 Mar 2025');
    expect(templateSheet?.rowCount).toBeGreaterThanOrEqual(
      1 + DEFAULT_GANTT_TEMPLATE_OPTIONS.employeeRows
    );
    expect(templateSheet?.views[0]).toMatchObject({
      state: 'frozen',
      xSplit: 1,
      ySplit: 1,
      showGridLines: false,
    });
    expect(templateSheet?.autoFilter).toBeUndefined();
    expect(templateSheet?.getCell('A1').font?.size).toBe(16);
    expect(templateSheet?.getCell('A1').font?.bold).toBe(true);
    expect(templateSheet?.getCell('B1').font?.bold ?? false).toBe(false);
    expect(templateSheet?.getCell('B1').alignment).toMatchObject({
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    });
    expect(templateSheet?.getCell('A1').border?.top?.style).toBe('thin');
    expect(templateSheet?.getCell('B2').border?.left?.style).toBe('thin');
    expect(templateSheet?.getColumn(2).width).toBe(11);
    expect(templateSheet?.getRow(1).height).toBe(60);
    expect(templateSheet?.getRow(12).hidden).toBe(true);
  });

  it('builds the ISO country code sheet from the shared country constants', async () => {
    const { blob } = await generateGanttTemplateWorkbook({
      anchorDate: new Date(2026, 2, 4),
      ...DEFAULT_GANTT_TEMPLATE_OPTIONS,
    });
    const workbook = await loadWorkbook(blob);
    const codesSheet = workbook.getWorksheet('ISO Country Codes');

    expect(codesSheet).toBeDefined();
    expect(codesSheet?.views[0]).toMatchObject({
      state: 'frozen',
      ySplit: 3,
      showGridLines: false,
    });
    expect(codesSheet?.getCell('A1').value).toBe('ISO Country Codes Reference');
    expect(codesSheet?.getCell('A3').text).toContain('https://www.iso.org/iso-3166-country-codes.html');
    expect(findRowByCode(codesSheet ?? workbook.worksheets[0], 'DE')).toEqual([
      'Schengen',
      'DE',
      'Germany',
      'Schengen',
      'Yes',
      'Counts toward the 90/180 rule',
    ]);
    expect(findRowByCode(codesSheet ?? workbook.worksheets[0], 'IE')).toEqual([
      'EU (non-Schengen)',
      'IE',
      'Ireland',
      'EU (non-Schengen)',
      'No',
      'EU country but does not count toward Schengen days',
    ]);
    expect(findRowByCode(codesSheet ?? workbook.worksheets[0], 'GB')).toEqual([
      'Other',
      'GB',
      'United Kingdom',
      'Non-Schengen',
      'No',
      'Does not count toward Schengen days',
    ]);
  });

  it('includes a worked example sheet with instructions and weekend travel continuation', async () => {
    const { blob } = await generateGanttTemplateWorkbook({
      anchorDate: new Date(2026, 2, 4),
      ...DEFAULT_GANTT_TEMPLATE_OPTIONS,
    });
    const workbook = await loadWorkbook(blob);
    const instructionsSheet = workbook.getWorksheet('Example & Instructions');

    expect(instructionsSheet?.getCell('A1').value).toBe('ComplyEur Gantt Template Guide');
    expect(instructionsSheet?.getCell('A1').font?.size).toBe(16);
    expect(instructionsSheet?.views[0]).toMatchObject({
      state: 'frozen',
      ySplit: 2,
      showGridLines: false,
    });
    expect(instructionsSheet?.getCell('A4').alignment).toMatchObject({
      horizontal: 'left',
      vertical: 'middle',
    });
    expect(instructionsSheet?.getCell('A2').text).toContain('Use the Template sheet for uploads');
    expect(flattenSheetValues(instructionsSheet ?? workbook.worksheets[0])).toContain(
      'Weekends are included and should be filled in when travel continues over a weekend.'
    );
    expect(flattenSheetValues(instructionsSheet ?? workbook.worksheets[0])).toContain(
      'Enter only one 2-letter ISO country code per day, such as DE or FR.'
    );
    expect(flattenSheetValues(instructionsSheet ?? workbook.worksheets[0])).toContain(
      'If someone travels from one EU country to another EU country, record the country they are in for that day.'
    );
    expect(flattenSheetValues(instructionsSheet ?? workbook.worksheets[0])).toContain(
      'If someone travels between an EU country and a non-EU country on the same day, record the country they are physically in at the end of that day.'
    );
    expect(flattenSheetValues(instructionsSheet ?? workbook.worksheets[0])).toContain('Sat 08 Mar 2025');
    expect(flattenSheetValues(instructionsSheet ?? workbook.worksheets[0])).toContain('GB');
    expect(flattenSheetValues(instructionsSheet ?? workbook.worksheets[0])).toContain('US');
  });

  it('rejects ranges that exceed the 500 day import limit', () => {
    expect(() =>
      buildGanttTemplateDates(
        new Date(2026, 2, 4),
        { unit: 'months', value: 18 },
        { unit: 'months', value: 6 }
      )
    ).toThrow(/500 days or fewer/);
  });

  it('calculates the expected total days for the default range', () => {
    const bounds = getGanttTemplateBounds(
      new Date(2026, 2, 4),
      DEFAULT_GANTT_TEMPLATE_OPTIONS.pastRange,
      DEFAULT_GANTT_TEMPLATE_OPTIONS.futureRange
    );

    expect(bounds.totalDays).toBeGreaterThan(400);
    expect(bounds.totalDays).toBeLessThanOrEqual(500);
  });
});

async function loadWorkbook(blob: Blob): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await blob.arrayBuffer());

  // @ts-expect-error ExcelJS type definitions predate the generic Buffer introduced in @types/node 20
  await workbook.xlsx.load(buffer);

  return workbook;
}

function getHeaderValues(sheet: ExcelJS.Worksheet): string[] {
  return (sheet.getRow(1).values as ExcelJS.CellValue[])
    .slice(1)
    .map((value) => String(value));
}

function findRowByCode(sheet: ExcelJS.Worksheet, code: string): string[] | null {
  for (let rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const rowValues = (sheet.getRow(rowIndex).values as ExcelJS.CellValue[])
      .slice(1)
      .map((value) => String(value ?? ''));

    if (rowValues[1] === code) {
      return rowValues;
    }
  }

  return null;
}

function flattenSheetValues(sheet: ExcelJS.Worksheet): string[] {
  const values: string[] = [];

  sheet.eachRow((row) => {
    for (const cell of (row.values as ExcelJS.CellValue[]).slice(1)) {
      if (cell !== null && cell !== undefined && String(cell).trim()) {
        values.push(String(cell));
      }
    }
  });

  return values;
}
