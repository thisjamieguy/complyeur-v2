/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TripForecastCalculator } from '@/app/(dashboard)/trip-forecast/trip-forecast-calculator';

const {
  addTripActionMock,
  updateTripActionMock,
  checkTripOverlapMock,
  showErrorMock,
  showSuccessMock,
} = vi.hoisted(() => ({
  addTripActionMock: vi.fn(),
  updateTripActionMock: vi.fn(),
  checkTripOverlapMock: vi.fn(),
  showErrorMock: vi.fn(),
  showSuccessMock: vi.fn(),
}));

vi.mock('@/components/forecasting/trip-forecast-form', () => ({
  TripForecastForm: ({
    onAddTrip,
  }: {
    onAddTrip: (
      employeeId: string,
      startDate: string,
      endDate: string,
      country: string
    ) => void;
  }) => (
    <button
      type="button"
      onClick={() => onAddTrip('emp-1', '2026-03-23', '2026-04-06', 'BG')}
    >
      Add scenario
    </button>
  ),
}));

vi.mock('@/components/forecasting/forecast-scenario-list', () => ({
  ForecastScenarioList: ({
    scenarios,
    onSaveTrip,
    onSaveAll,
    pendingConflict,
    onReplaceConflictTrip,
    onDismissConflictDialog,
  }: {
    scenarios: Array<{ key: string }>;
    onSaveTrip: (key: string) => void;
    onSaveAll: () => void;
    pendingConflict: { message: string } | null;
    onReplaceConflictTrip: () => void;
    onDismissConflictDialog: () => void;
  }) => (
    <div>
      <div data-testid="scenario-count">{scenarios.length}</div>
      {scenarios[0] ? (
        <button type="button" onClick={() => onSaveTrip(scenarios[0].key)}>
          Save Trip
        </button>
      ) : null}
      {scenarios.length > 0 ? (
        <button type="button" onClick={onSaveAll}>
          Save All Trips
        </button>
      ) : null}
      {pendingConflict ? (
        <div>
          <div>Overlap warning</div>
          <div>{pendingConflict.message}</div>
          <button type="button" onClick={onDismissConflictDialog}>
            Edit trip
          </button>
          <button type="button" onClick={onReplaceConflictTrip}>
            Replace trip entirely
          </button>
        </div>
      ) : null}
    </div>
  ),
}));

vi.mock('@/lib/services/forecast-service', () => ({
  calculateMultiTripScenario: vi.fn(() => []),
  getCountryName: vi.fn(() => 'Bulgaria'),
}));

vi.mock('@/app/(dashboard)/actions', () => ({
  addTripAction: addTripActionMock,
  updateTripAction: updateTripActionMock,
}));

vi.mock('@/lib/validations/trip-overlap', () => ({
  checkTripOverlap: checkTripOverlapMock,
}));

vi.mock('@/lib/toast', () => ({
  showError: showErrorMock,
  showSuccess: showSuccessMock,
}));

describe('TripForecastCalculator', () => {
  const employees = [{ id: 'emp-1', name: 'James Walsh' }];
  const tripsMap = {
    'emp-1': {
      employeeName: 'James Walsh',
      trips: [],
    },
  };

  it('shows the overlap message instead of calling the save action for a single trip', async () => {
    checkTripOverlapMock.mockResolvedValue({
      hasOverlap: true,
      conflictingTrip: { id: 'trip-123' },
      message:
        'This trip overlaps with an existing trip (25 Mar 2026 - 18 Apr 2026). Please adjust the dates.',
    });

    render(<TripForecastCalculator employees={employees} tripsMap={tripsMap} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add scenario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Trip' }));

    await waitFor(() => {
      expect(screen.getByText('Overlap warning')).toBeInTheDocument();
      expect(screen.getByText(
        'This trip overlaps with an existing trip (25 Mar 2026 - 18 Apr 2026). Please adjust the dates.'
      )).toBeInTheDocument();
    });

    expect(addTripActionMock).not.toHaveBeenCalled();
    expect(updateTripActionMock).not.toHaveBeenCalled();
    expect(showErrorMock).not.toHaveBeenCalled();
    expect(showSuccessMock).not.toHaveBeenCalled();
  });

  it('replaces the conflicting trip when the user confirms the warning', async () => {
    checkTripOverlapMock.mockResolvedValue({
      hasOverlap: true,
      conflictingTrip: { id: 'trip-123' },
      message:
        'This trip overlaps with an existing trip (25 Mar 2026 - 18 Apr 2026). Please adjust the dates.',
    });
    updateTripActionMock.mockResolvedValue({});

    render(<TripForecastCalculator employees={employees} tripsMap={tripsMap} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add scenario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Trip' }));

    await screen.findByText('Overlap warning');

    fireEvent.click(screen.getByRole('button', { name: 'Replace trip entirely' }));

    await waitFor(() => {
      expect(updateTripActionMock).toHaveBeenCalledWith(
        'trip-123',
        'emp-1',
        {
          country: 'BG',
          entry_date: '2026-03-23',
          exit_date: '2026-04-06',
          purpose: null,
          job_ref: null,
          is_private: false,
          ghosted: false,
        }
      );
    });

    expect(addTripActionMock).not.toHaveBeenCalled();
    expect(showSuccessMock).toHaveBeenCalledWith(
      'Trip replaced',
      'Bulgaria trip replaced the existing trip.'
    );
  });

  it('uses the same warning dialog for save all and completes the batch after replacement', async () => {
    checkTripOverlapMock.mockResolvedValue({
      hasOverlap: true,
      conflictingTrip: { id: 'trip-456' },
      message:
        'This trip overlaps with an existing trip (25 Mar 2026 - 18 Apr 2026). Please adjust the dates.',
    });
    updateTripActionMock.mockResolvedValue({});

    render(<TripForecastCalculator employees={employees} tripsMap={tripsMap} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add scenario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save All Trips' }));

    await screen.findByText('Overlap warning');

    fireEvent.click(screen.getByRole('button', { name: 'Replace trip entirely' }));

    await waitFor(() => {
      expect(updateTripActionMock).toHaveBeenCalledWith(
        'trip-456',
        'emp-1',
        {
          country: 'BG',
          entry_date: '2026-03-23',
          exit_date: '2026-04-06',
          purpose: null,
          job_ref: null,
          is_private: false,
          ghosted: false,
        }
      );
    });

    expect(addTripActionMock).not.toHaveBeenCalled();
    expect(showSuccessMock).toHaveBeenCalledWith('1 trip saved');
  });
});
