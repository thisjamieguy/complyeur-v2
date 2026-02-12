/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormatSelector } from '../FormatSelector';

describe('FormatSelector', () => {
  it('downloads a template file instead of opening it in a new tab', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const openSpy = vi.spyOn(window, 'open');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    render(<FormatSelector />);

    fireEvent.click(screen.getAllByRole('button', { name: /template/i })[0]);

    expect(openSpy).not.toHaveBeenCalled();

    const anchorCallIndex = createElementSpy.mock.calls.findIndex(([tagName]) => tagName === 'a');
    expect(anchorCallIndex).toBeGreaterThanOrEqual(0);

    const anchor = createElementSpy.mock.results[anchorCallIndex]?.value as HTMLAnchorElement;
    expect(anchor).toBeInstanceOf(HTMLAnchorElement);
    expect(anchor.getAttribute('href')).toBe('/templates/employees-template.csv');
    expect(anchor.download).toBe('employees-template.csv');
    expect(appendChildSpy).toHaveBeenCalledWith(anchor);
  });
});
