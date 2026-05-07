/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormatSelector } from '../FormatSelector';

const { downloadGanttTemplateMock } = vi.hoisted(() => ({
  downloadGanttTemplateMock: vi.fn(),
}));

vi.mock('@/lib/import/gantt/template-download', () => ({
  downloadGanttTemplate: downloadGanttTemplateMock,
}));

vi.mock('@/lib/import/gantt/template-config', () => ({
  DEFAULT_GANTT_TEMPLATE_OPTIONS: {
    employeeRows: 10,
    pastRange: { unit: 'months', value: 12 },
    futureRange: { unit: 'weeks', value: 12 },
  },
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
    expect(downloadGanttTemplateMock).not.toHaveBeenCalled();
  });

  it('generates and downloads the gantt workbook from the Template action', async () => {
    downloadGanttTemplateMock.mockResolvedValue(undefined);

    render(<FormatSelector />);

    fireEvent.click(screen.getAllByRole('button', { name: /^template$/i })[2]);

    await waitFor(() => {
      expect(downloadGanttTemplateMock).toHaveBeenCalledTimes(1);
    });

    expect(downloadGanttTemplateMock).toHaveBeenCalledWith({
      employeeRows: 10,
      pastRange: { unit: 'months', value: 12 },
      futureRange: { unit: 'weeks', value: 12 },
    });
  });

  it('shows the customize action only for the gantt card and opens the dialog', () => {
    render(<FormatSelector maxEmployees={50} />);

    const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
    expect(customizeButtons).toHaveLength(1);

    fireEvent.click(customizeButtons[0]);

    expect(screen.getByText('Customize Gantt Template')).toBeInTheDocument();
  });
});
