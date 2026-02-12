export type PreferredImportDateFormat = 'DD/MM' | 'MM/DD';
export type DateDisplayFormat = 'DD-MM-YYYY' | 'YYYY-MM-DD';

export const IMPORT_DATE_FORMAT_STORAGE_KEY = 'complyeur.preferences.import_date_format';
export const DATE_DISPLAY_FORMAT_STORAGE_KEY = 'complyeur.preferences.date_display_format';

export const DEFAULT_IMPORT_DATE_FORMAT: PreferredImportDateFormat = 'DD/MM';
export const DEFAULT_DATE_DISPLAY_FORMAT: DateDisplayFormat = 'DD-MM-YYYY';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredImportDateFormat(): PreferredImportDateFormat {
  if (!hasWindow()) return DEFAULT_IMPORT_DATE_FORMAT;

  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== 'function') return DEFAULT_IMPORT_DATE_FORMAT;

  const value = storage.getItem(IMPORT_DATE_FORMAT_STORAGE_KEY);
  return value === 'MM/DD' ? 'MM/DD' : DEFAULT_IMPORT_DATE_FORMAT;
}

export function setStoredImportDateFormat(format: PreferredImportDateFormat): void {
  if (!hasWindow()) return;
  const storage = window.localStorage;
  if (!storage || typeof storage.setItem !== 'function') return;
  storage.setItem(IMPORT_DATE_FORMAT_STORAGE_KEY, format);
}

export function getStoredDateDisplayFormat(): DateDisplayFormat {
  if (!hasWindow()) return DEFAULT_DATE_DISPLAY_FORMAT;

  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== 'function') return DEFAULT_DATE_DISPLAY_FORMAT;

  const value = storage.getItem(DATE_DISPLAY_FORMAT_STORAGE_KEY);
  return value === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : DEFAULT_DATE_DISPLAY_FORMAT;
}

export function setStoredDateDisplayFormat(format: DateDisplayFormat): void {
  if (!hasWindow()) return;
  const storage = window.localStorage;
  if (!storage || typeof storage.setItem !== 'function') return;
  storage.setItem(DATE_DISPLAY_FORMAT_STORAGE_KEY, format);
}

export function formatIsoDateForDisplay(
  isoDate: string,
  displayFormat: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT
): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;

  const [, year, month, day] = match;
  if (displayFormat === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  return `${day}-${month}-${year}`;
}
