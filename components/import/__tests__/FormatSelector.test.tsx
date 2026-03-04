/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormatSelector } from '../FormatSelector';

const { downloadBlobMock, generateGanttTemplateWorkbookMock } = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
  generateGanttTemplateWorkbookMock: vi.fn(),
}));

vi.mock('@/lib/import/gantt/template-workbook', () => ({
  DEFAULT_GANTT_TEMPLATE_OPTIONS: {
    employeeRows: 10,
    pastRange: { unit: 'months', value: 12 },
    futureRange: { unit: 'weeks', value: 12 },
  },
  downloadBlob: downloadBlobMock,
  generateGanttTemplateWorkbook: generateGanttTemplateWorkbookMock,
}));

vi.mock('../GanttTemplateDialog', () => ({
  GanttTemplateDialog: ({
    open,
  }: {
    open: boolean;
  }) => (open ? <div>Customize Gantt Template</div> : null),
}));

vi.mock('@/lib/toast', () => ({
  showError: vi.fn(),
}));

describe('FormatSelector', () => {
  it('downloads employee templates using the existing static csv link', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    render(<FormatSelector />);

    fireEvent.click(screen.getAllByRole('button', { name: /^template$/i })[0]);

    const anchorCallIndex = createElementSpy.mock.calls.findIndex(([tagName]) => tagName === 'a');
    expect(anchorCallIndex).toBeGreaterThanOrEqual(0);

    const anchor = createElementSpy.mock.results[anchorCallIndex]?.value as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toBe('/templates/employees-template.csv');
    expect(anchor.download).toBe('employees-template.csv');
    expect(appendChildSpy).toHaveBeenCalledWith(anchor);
    expect(generateGanttTemplateWorkbookMock).not.toHaveBeenCalled();
    expect(downloadBlobMock).not.toHaveBeenCalled();
  });

  it('generates and downloads the gantt workbook from the Template action', async () => {
    generateGanttTemplateWorkbookMock.mockResolvedValue({
      blob: new Blob(['xlsx']),
      filename: 'complyeur_gantt_template_2026-03-04_10-00-00.xlsx',
    });

    render(<FormatSelector />);

    fireEvent.click(screen.getAllByRole('button', { name: /^template$/i })[2]);

    await waitFor(() => {
      expect(generateGanttTemplateWorkbookMock).toHaveBeenCalledTimes(1);
    });

    expect(downloadBlobMock).toHaveBeenCalledWith(
      expect.any(Blob),
      'complyeur_gantt_template_2026-03-04_10-00-00.xlsx'
    );
  });

  it('shows the customize action only for the gantt card and opens the dialog', () => {
    render(<FormatSelector maxEmployees={50} />);

    const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
    expect(customizeButtons).toHaveLength(1);

    fireEvent.click(customizeButtons[0]);

    expect(screen.getByText('Customize Gantt Template')).toBeInTheDocument();
  });
});
