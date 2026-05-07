/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttTemplateDialog } from '../GanttTemplateDialog';

const { downloadGanttTemplateMock } = vi.hoisted(() => ({
  downloadGanttTemplateMock: vi.fn(),
}));

vi.mock('@/lib/import/gantt/template-download', () => ({
  downloadGanttTemplate: downloadGanttTemplateMock,
}));

vi.mock('@/lib/toast', () => ({
  showError: vi.fn(),
}));

HTMLElement.prototype.hasPointerCapture ??= () => false;
HTMLElement.prototype.setPointerCapture ??= () => {};
HTMLElement.prototype.releasePointerCapture ??= () => {};

describe('GanttTemplateDialog', () => {
  it('renders the default workbook summary for a valid starting state', () => {
    render(<GanttTemplateDialog open onOpenChange={vi.fn()} maxEmployees={50} />);

    expect(
      screen.getByText(/This workbook will include 10 blank employee rows/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download custom template/i })
    ).toBeEnabled();
  });

  it('disables download when employee rows are invalid', () => {
    render(<GanttTemplateDialog open onOpenChange={vi.fn()} maxEmployees={50} />);

    fireEvent.change(screen.getByLabelText(/blank employee rows/i), {
      target: { value: '0' },
    });

    expect(screen.getByText(/Employee rows must be at least 1/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download custom template/i })
    ).toBeDisabled();
  });

  it('shows the live plan cap text for employee rows', () => {
    render(<GanttTemplateDialog open onOpenChange={vi.fn()} maxEmployees={50} />);

    expect(screen.getByText(/Up to 50 rows on your current plan/i)).toBeInTheDocument();
  });

  it('downloads a workbook when the default configuration is valid', async () => {
    downloadGanttTemplateMock.mockResolvedValue(undefined);

    const onOpenChange = vi.fn();
    render(<GanttTemplateDialog open onOpenChange={onOpenChange} maxEmployees={50} />);

    fireEvent.click(screen.getByRole('button', { name: /download custom template/i }));

    await waitFor(() => {
      expect(downloadGanttTemplateMock).toHaveBeenCalledTimes(1);
    });

    expect(downloadGanttTemplateMock).toHaveBeenCalledWith({
      employeeRows: 10,
      pastRange: { unit: 'months', value: 12 },
      futureRange: { unit: 'weeks', value: 12 },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
