/**
 * Country Code Normalizer for ComplyEur Import
 * Converts country names to ISO codes and validates Schengen membership.
 *
 * What it does:
 * - Normalizes country names/codes to standard ISO 3166-1 alpha-2 codes
 * - Validates whether a country is in the Schengen zone
 * - Handles common misspellings and alternative names
 * - Provides warnings for EU non-Schengen countries
 *
 * Why it matters:
 * - Users input "Germany" or "DE" or "Deutschland" interchangeably
 * - 90/180 rule only applies to Schengen, not all of EU
 * - Clear warnings prevent compliance calculation errors
 */

/**
 * Full list of Schengen member countries (as of 2024).
 * 27 countries total including Iceland, Liechtenstein, Norway, Switzerland (non-EU).
 */
export const SCHENGEN_COUNTRIES = new Set([
  'AT', // Austria
  'BE', // Belgium
  'CH', // Switzerland
  'CZ', // Czech Republic
  'DE', // Germany
  'DK', // Denmark
  'EE', // Estonia
  'ES', // Spain
  'FI', // Finland
  'FR', // France
  'GR', // Greece
  'HR', // Croatia (joined Jan 2023)
  'HU', // Hungary
  'IS', // Iceland
  'IT', // Italy
  'LI', // Liechtenstein
  'LT', // Lithuania
  'LU', // Luxembourg
  'LV', // Latvia
  'MT', // Malta
  'NL', // Netherlands
  'NO', // Norway
  'PL', // Poland
  'PT', // Portugal
  'SE', // Sweden
  'SI', // Slovenia
  'SK', // Slovakia
]);

/**
 * Schengen-associated microstates (de facto part of Schengen area).
 * These countries apply Schengen rules by agreement.
 */
export const SCHENGEN_MICROSTATES = new Set([
  'AD', // Andorra
  'MC', // Monaco
  'SM', // San Marino
  'VA', // Vatican City
]);

/**
 * EU countries NOT in Schengen (important distinction for 90/180 rule).
 */
export const EU_NON_SCHENGEN = new Set([
  'BG', // Bulgaria (joining soon)
  'CY', // Cyprus
  'IE', // Ireland (permanent opt-out)
  'RO', // Romania (joining soon)
]);

/**
 * Comprehensive mapping of country names to ISO codes.
 * Includes: native names, common misspellings, abbreviations.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // Schengen countries
  austria: 'AT',
  österreich: 'AT',
  osterreich: 'AT',
  at: 'AT',
  aut: 'AT',

  belgium: 'BE',
  belgique: 'BE',
  belgie: 'BE',
  belgië: 'BE',
  be: 'BE',
  bel: 'BE',

  switzerland: 'CH',
  schweiz: 'CH',
  suisse: 'CH',
  svizzera: 'CH',
  swiss: 'CH',
  ch: 'CH',
  che: 'CH',

  'czech republic': 'CZ',
  czechia: 'CZ',
  czech: 'CZ',
  'ceska republika': 'CZ',
  cz: 'CZ',
  cze: 'CZ',

  germany: 'DE',
  deutschland: 'DE',
  de: 'DE',
  deu: 'DE',
  ger: 'DE',

  denmark: 'DK',
  danmark: 'DK',
  dk: 'DK',
  dnk: 'DK',

  estonia: 'EE',
  eesti: 'EE',
  ee: 'EE',
  est: 'EE',

  spain: 'ES',
  españa: 'ES',
  espana: 'ES',
  es: 'ES',
  esp: 'ES',

  finland: 'FI',
  suomi: 'FI',
  fi: 'FI',
  fin: 'FI',

  france: 'FR',
  fr: 'FR',
  fra: 'FR',

  greece: 'GR',
  hellas: 'GR',
  ellada: 'GR',
  gr: 'GR',
  grc: 'GR',

  croatia: 'HR',
  hrvatska: 'HR',
  hr: 'HR',
  hrv: 'HR',

  hungary: 'HU',
  magyarország: 'HU',
  magyarorszag: 'HU',
  hu: 'HU',
  hun: 'HU',

  iceland: 'IS',
  ísland: 'IS',
  island: 'IS',
  is: 'IS',
  isl: 'IS',

  italy: 'IT',
  italia: 'IT',
  it: 'IT',
  ita: 'IT',

  liechtenstein: 'LI',
  li: 'LI',
  lie: 'LI',

  lithuania: 'LT',
  lietuva: 'LT',
  lt: 'LT',
  ltu: 'LT',

  luxembourg: 'LU',
  luxemburg: 'LU',
  lëtzebuerg: 'LU',
  lu: 'LU',
  lux: 'LU',

  latvia: 'LV',
  latvija: 'LV',
  lv: 'LV',
  lva: 'LV',

  malta: 'MT',
  mt: 'MT',
  mlt: 'MT',

  netherlands: 'NL',
  'the netherlands': 'NL',
  holland: 'NL',
  nederland: 'NL',
  nl: 'NL',
  nld: 'NL',

  norway: 'NO',
  norge: 'NO',
  no: 'NO',
  nor: 'NO',

  poland: 'PL',
  polska: 'PL',
  pl: 'PL',
  pol: 'PL',

  portugal: 'PT',
  pt: 'PT',
  prt: 'PT',

  sweden: 'SE',
  sverige: 'SE',
  se: 'SE',
  swe: 'SE',

  slovenia: 'SI',
  slovenija: 'SI',
  si: 'SI',
  svn: 'SI',

  slovakia: 'SK',
  slovensko: 'SK',
  sk: 'SK',
  svk: 'SK',

  // Schengen microstates
  andorra: 'AD',
  ad: 'AD',
  and: 'AD',

  monaco: 'MC',
  mc: 'MC',
  mco: 'MC',

  'san marino': 'SM',
  sanmarino: 'SM',
  sm: 'SM',
  smr: 'SM',

  vatican: 'VA',
  'vatican city': 'VA',
  'holy see': 'VA',
  va: 'VA',
  vat: 'VA',

  // EU non-Schengen
  ireland: 'IE',
  éire: 'IE',
  eire: 'IE',
  ie: 'IE',
  irl: 'IE',

  cyprus: 'CY',
  kypros: 'CY',
  cy: 'CY',
  cyp: 'CY',

  bulgaria: 'BG',
  bg: 'BG',
  bgr: 'BG',

  romania: 'RO',
  românia: 'RO',
  ro: 'RO',
  rou: 'RO',

  // Common non-EU/Schengen countries for reference
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  britain: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  gb: 'GB',
  gbr: 'GB',

  'united states': 'US',
  usa: 'US',
  us: 'US',
  america: 'US',
  'united states of america': 'US',

  canada: 'CA',
  ca: 'CA',
  can: 'CA',

  australia: 'AU',
  au: 'AU',
  aus: 'AU',

  'new zealand': 'NZ',
  nz: 'NZ',
  nzl: 'NZ',

  japan: 'JP',
  jp: 'JP',
  jpn: 'JP',

  china: 'CN',
  cn: 'CN',
  chn: 'CN',

  india: 'IN',
  in: 'IN',
  ind: 'IN',
};

/**
 * Human-readable display names for country codes.
 */
const DISPLAY_NAMES: Record<string, string> = {
  // Schengen
  AT: 'Austria',
  BE: 'Belgium',
  CH: 'Switzerland',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  EE: 'Estonia',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GR: 'Greece',
  HR: 'Croatia',
  HU: 'Hungary',
  IS: 'Iceland',
  IT: 'Italy',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  MT: 'Malta',
  NL: 'Netherlands',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  SE: 'Sweden',
  SI: 'Slovenia',
  SK: 'Slovakia',
  // Microstates
  AD: 'Andorra',
  MC: 'Monaco',
  SM: 'San Marino',
  VA: 'Vatican City',
  // EU non-Schengen
  IE: 'Ireland',
  CY: 'Cyprus',
  BG: 'Bulgaria',
  RO: 'Romania',
  // Non-EU
  GB: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
};

/**
 * Result of country normalization attempt.
 */
export interface CountryNormalizationResult {
  /** ISO 3166-1 alpha-2 code, or null if unrecognized */
  code: string | null;
  /** Whether the country is in the Schengen zone */
  isSchengen: boolean;
  /** Whether it's a Schengen microstate (de facto Schengen) */
  isMicrostate: boolean;
  /** Whether it's EU but not Schengen (important distinction) */
  isEuNonSchengen: boolean;
  /** Original input value */
  original: string;
  /** Human-readable country name */
  displayName: string | null;
  /** Warning message if applicable (e.g., non-Schengen countries) */
  warning?: string;
}

/**
 * Normalizes a country input to its ISO code and validates Schengen status.
 *
 * @param input - Country name or code to normalize
 * @returns Normalization result with code, Schengen status, and any warnings
 *
 * @example
 * normalizeCountry("Germany")  // { code: "DE", isSchengen: true }
 * normalizeCountry("UK")       // { code: "GB", isSchengen: false, warning: "..." }
 * normalizeCountry("Ireland")  // { code: "IE", isSchengen: false, isEuNonSchengen: true }
 */
export function normalizeCountry(input: string): CountryNormalizationResult {
  if (!input || typeof input !== 'string') {
    return {
      code: null,
      isSchengen: false,
      isMicrostate: false,
      isEuNonSchengen: false,
      original: '',
      displayName: null,
      warning: 'Empty country value',
    };
  }

  const cleaned = input.toLowerCase().trim();
  const code = COUNTRY_NAME_TO_CODE[cleaned] ?? null;

  if (!code) {
    // Check if it might be a 2 or 3 letter code we don't recognize
    if (/^[A-Z]{2}$/i.test(cleaned)) {
      const upperCode = cleaned.toUpperCase();
      return {
        code: upperCode,
        isSchengen: false,
        isMicrostate: false,
        isEuNonSchengen: false,
        original: input,
        displayName: null,
        warning: `Unrecognized country code: ${upperCode}. This trip will not count towards Schengen days.`,
      };
    }
    if (/^[A-Z]{3}$/i.test(cleaned)) {
      return {
        code: null,
        isSchengen: false,
        isMicrostate: false,
        isEuNonSchengen: false,
        original: input,
        displayName: null,
        warning: `Unrecognized 3-letter code: "${input}". Use 2-letter ISO code (e.g., DE, FR) or full name.`,
      };
    }
    return {
      code: null,
      isSchengen: false,
      isMicrostate: false,
      isEuNonSchengen: false,
      original: input,
      displayName: null,
      warning: `Could not recognize country: "${input}". Use a country code (DE, FR) or full name (Germany, France).`,
    };
  }

  const isSchengen = SCHENGEN_COUNTRIES.has(code) || SCHENGEN_MICROSTATES.has(code);
  const isMicrostate = SCHENGEN_MICROSTATES.has(code);
  const isEuNonSchengen = EU_NON_SCHENGEN.has(code);

  let warning: string | undefined;

  if (isEuNonSchengen) {
    warning = `${DISPLAY_NAMES[code]} is in the EU but NOT in the Schengen zone. This trip will not count towards the 90/180-day rule.`;
  } else if (code === 'GB') {
    warning = `The UK is not in the Schengen zone. This trip will not count towards the 90/180-day rule.`;
  } else if (!isSchengen && DISPLAY_NAMES[code]) {
    warning = `${DISPLAY_NAMES[code]} is not in the Schengen zone. This trip will not count towards the 90/180-day rule.`;
  }

  return {
    code,
    isSchengen,
    isMicrostate,
    isEuNonSchengen,
    original: input,
    displayName: DISPLAY_NAMES[code] ?? null,
    warning,
  };
}

/**
 * Quick check if a country code is in the Schengen zone.
 *
 * @param code - ISO 3166-1 alpha-2 country code
 * @returns true if Schengen (including microstates)
 */
export function isSchengenCountry(code: string): boolean {
  const upper = code.toUpperCase();
  return SCHENGEN_COUNTRIES.has(upper) || SCHENGEN_MICROSTATES.has(upper);
}

/**
 * Gets the human-readable name for a country code.
 *
 * @param code - ISO 3166-1 alpha-2 country code
 * @returns Display name or the code itself if unknown
 */
export function getCountryDisplayName(code: string): string {
  return DISPLAY_NAMES[code.toUpperCase()] ?? code;
}

/**
 * Gets all Schengen country codes for validation/selection.
 */
export function getAllSchengenCodes(): string[] {
  return Array.from(SCHENGEN_COUNTRIES).concat(Array.from(SCHENGEN_MICROSTATES));
}

/**
 * Validates and normalizes an array of country values.
 * Useful for batch processing imported data.
 *
 * @param countries - Array of country strings to normalize
 * @returns Array of normalization results
 */
export function normalizeCountries(countries: string[]): CountryNormalizationResult[] {
  return countries.map(normalizeCountry);
}

/**
 * Gets a summary of countries in an import batch.
 * Useful for preview/confirmation screens.
 */
export function summarizeCountries(
  countries: string[]
): {
  total: number;
  schengen: number;
  nonSchengen: number;
  unrecognized: number;
  byCountry: Map<string, number>;
} {
  const results = normalizeCountries(countries);
  const byCountry = new Map<string, number>();

  for (const result of results) {
    const key = result.code ?? 'UNKNOWN';
    byCountry.set(key, (byCountry.get(key) ?? 0) + 1);
  }

  return {
    total: results.length,
    schengen: results.filter((r) => r.isSchengen).length,
    nonSchengen: results.filter((r) => !r.isSchengen && r.code !== null).length,
    unrecognized: results.filter((r) => r.code === null).length,
    byCountry,
  };
}
