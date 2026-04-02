/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FileDropzone } from '../FileDropzone';

vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, disabled }: { onDrop: (acceptedFiles: File[], rejections: never[]) => void; disabled: boolean }) => ({
    getRootProps: () => ({
      role: 'presentation',
      tabIndex: 0,
    }),
    getInputProps: () => ({
      type: 'file',
      onChange: (event: Event) => {
        if (disabled) return;
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        onDrop(files, []);
      },
    }),
    isDragActive: false,
  }),
}));

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('file input not found');
  }
  return input as HTMLInputElement;
}

describe('FileDropzone', () => {
  it('keeps Validate & Preview disabled until a file is selected', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone format="employees" onFileSelect={onFileSelect} isProcessing={false} />);

    expect(screen.getByRole('button', { name: /validate & preview/i })).toBeDisabled();
  });

  it('shows a selected valid file and enables submission', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileDropzone format="employees" onFileSelect={onFileSelect} isProcessing={false} />
    );

    const file = new File(['first_name,last_name,email\nJohn,Doe,john@test.com'], 'employees.csv', {
      type: 'text/csv',
    });

    await act(async () => {
      fireEvent.change(getFileInput(container), { target: { files: [file] } });
    });

    await waitFor(() => expect(screen.getByText('employees.csv')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /validate & preview/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /validate & preview/i }));
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('rejects unsupported spreadsheet file types and keeps submission disabled', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileDropzone format="employees" onFileSelect={onFileSelect} isProcessing={false} />
    );

    const file = new File(['macro'], 'employees.xlsm', {
      type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    });

    await act(async () => {
      fireEvent.change(getFileInput(container), { target: { files: [file] } });
    });

    await waitFor(() => expect(screen.getByText(/invalid file type/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /validate & preview/i })).toBeDisabled();
  });

  it('clears a previous error when a valid retry file is selected', async () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileDropzone format="employees" onFileSelect={onFileSelect} isProcessing={false} />
    );

    const invalidFile = new File(['macro'], 'employees.xlsm', {
      type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    });
    await act(async () => {
      fireEvent.change(getFileInput(container), { target: { files: [invalidFile] } });
    });
    await waitFor(() => expect(screen.getByText(/invalid file type/i)).toBeInTheDocument());

    const validFile = new File(['first_name,last_name,email\nJane,Doe,jane@test.com'], 'employees.csv', {
      type: 'text/csv',
    });
    await act(async () => {
      fireEvent.change(getFileInput(container), { target: { files: [validFile] } });
    });

    await waitFor(() => expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument());
    expect(screen.getByText('employees.csv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate & preview/i })).toBeEnabled();
  });

  it('shows processing state and disables controls while upload is in progress', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone format="employees" onFileSelect={onFileSelect} isProcessing />);

    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled();
  });
});
