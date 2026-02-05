/**
 * Nationality type constants for employee compliance tracking.
 *
 * EU/Schengen citizens are exempt from the 90/180-day rule
 * since they have freedom of movement within the Schengen area.
 */

export type NationalityType = 'uk_citizen' | 'eu_schengen_citizen' | 'rest_of_world'

export const NATIONALITY_TYPE_LABELS: Record<NationalityType, string> = {
  uk_citizen: 'UK Citizen',
  eu_schengen_citizen: 'EU/Schengen Citizen',
  rest_of_world: 'Rest of World',
}

export const NATIONALITY_TYPES = Object.keys(NATIONALITY_TYPE_LABELS) as NationalityType[]

/**
 * Returns true if the nationality type is exempt from 90/180-day compliance tracking.
 * Currently only EU/Schengen citizens are exempt.
 */
export function isExemptFromTracking(nationalityType: NationalityType): boolean {
  return nationalityType === 'eu_schengen_citizen'
}
