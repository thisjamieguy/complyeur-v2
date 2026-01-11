/**
 * @fileoverview Database queries for forecasting functionality.
 *
 * Phase 10: Forecasting & Planning
 * Provides data access for future job alerts and what-if calculations.
 */

import { createClient } from '@/lib/supabase/server';
import { DatabaseError } from '@/lib/errors';
import type { Trip } from '@/types/database';
import type { ForecastTrip, ForecastEmployee } from '@/types/forecast';

/**
 * Converts database Trip to ForecastTrip format.
 */
function toForecastTrip(trip: Trip): ForecastTrip {
  return {
    id: trip.id,
    employeeId: trip.employee_id,
    companyId: trip.company_id,
    country: trip.country,
    entryDate: trip.entry_date,
    exitDate: trip.exit_date,
    purpose: trip.purpose,
    jobRef: trip.job_ref,
    isPrivate: trip.is_private ?? false,
    ghosted: trip.ghosted ?? false,
    travelDays: trip.travel_days ?? 0,
  };
}

/**
 * Get all future trips for the current user's company.
 * Future trips are those with entry_date > today.
 */
export async function getFutureTrips(): Promise<
  Array<ForecastTrip & { employee_name: string }>
> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      employee:employees!inner(name)
    `
    )
    .gte('entry_date', today)
    .eq('ghosted', false)
    .order('entry_date', { ascending: true });

  if (error) {
    console.error('Error fetching future trips:', error);
    throw new DatabaseError('Failed to fetch future trips');
  }

  return (data ?? []).map((trip) => {
    const employee = trip.employee as { name: string };
    return {
      ...toForecastTrip(trip as Trip),
      employee_name: employee.name,
    };
  });
}

/**
 * Get all trips for a specific employee.
 * Includes both past and future trips for forecast calculations.
 */
export async function getAllTripsForEmployee(
  employeeId: string
): Promise<ForecastTrip[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('employee_id', employeeId)
    .order('entry_date', { ascending: true });

  if (error) {
    console.error('Error fetching employee trips:', error);
    throw new DatabaseError('Failed to fetch employee trips');
  }

  return (data ?? []).map(toForecastTrip);
}

/**
 * Get all trips grouped by employee for the current company.
 * Used for batch forecast calculations.
 */
export async function getAllTripsGroupedByEmployee(): Promise<
  Map<string, { employee: ForecastEmployee; trips: ForecastTrip[] }>
> {
  const supabase = await createClient();

  // Get all employees
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, name')
    .order('name', { ascending: true });

  if (employeesError) {
    console.error('Error fetching employees:', employeesError);
    throw new DatabaseError('Failed to fetch employees');
  }

  // Get all trips
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .order('entry_date', { ascending: true });

  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
    throw new DatabaseError('Failed to fetch trips');
  }

  // Group trips by employee
  const grouped = new Map<
    string,
    { employee: ForecastEmployee; trips: ForecastTrip[] }
  >();

  for (const employee of employees ?? []) {
    grouped.set(employee.id, {
      employee: { id: employee.id, name: employee.name },
      trips: [],
    });
  }

  for (const trip of trips ?? []) {
    const employeeData = grouped.get(trip.employee_id);
    if (employeeData) {
      employeeData.trips.push(toForecastTrip(trip));
    }
  }

  return grouped;
}

/**
 * Get all employees for the current company.
 * Used for what-if scenario employee selector.
 */
export async function getEmployeesForSelect(): Promise<ForecastEmployee[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    throw new DatabaseError('Failed to fetch employees');
  }

  return (data ?? []).map((emp) => ({
    id: emp.id,
    name: emp.name,
  }));
}
