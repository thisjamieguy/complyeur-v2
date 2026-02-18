// ============================================================
// COUNTRY NAME TO ISO 3166-1 ALPHA-2 CODE CONVERTER
// ============================================================

/**
 * Maps country names to their 2-letter ISO codes.
 * Supports English, French, German, and Spanish country names.
 * Used during trip import to normalize country values before database insert.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // =====================
  // AUSTRIA (AT)
  // =====================
  AUSTRIA: 'AT',
  AUTRICHE: 'AT', // French
  ÖSTERREICH: 'AT', // German
  OSTERREICH: 'AT', // German (no umlaut)

  // =====================
  // BELGIUM (BE)
  // =====================
  BELGIUM: 'BE',
  BELGIQUE: 'BE', // French
  BELGIEN: 'BE', // German
  BÉLGICA: 'BE', // Spanish
  BELGICA: 'BE', // Spanish (no accent)

  // =====================
  // CROATIA (HR)
  // =====================
  CROATIA: 'HR',
  CROATIE: 'HR', // French
  KROATIEN: 'HR', // German
  CROACIA: 'HR', // Spanish

  // =====================
  // CZECHIA (CZ)
  // =====================
  CZECHIA: 'CZ',
  'CZECH REPUBLIC': 'CZ',
  TCHÉQUIE: 'CZ', // French
  TCHEQUIE: 'CZ', // French (no accent)
  'RÉPUBLIQUE TCHÈQUE': 'CZ', // French
  'REPUBLIQUE TCHEQUE': 'CZ', // French (no accents)
  TSCHECHIEN: 'CZ', // German
  CHEQUIA: 'CZ', // Spanish
  'REPÚBLICA CHECA': 'CZ', // Spanish
  'REPUBLICA CHECA': 'CZ', // Spanish (no accent)

  // =====================
  // DENMARK (DK)
  // =====================
  DENMARK: 'DK',
  DANEMARK: 'DK', // French
  DÄNEMARK: 'DK', // German
  DANEMARK_DE: 'DK', // German (no umlaut) - use alias
  DINAMARCA: 'DK', // Spanish

  // =====================
  // ESTONIA (EE)
  // =====================
  ESTONIA: 'EE',
  ESTONIE: 'EE', // French
  ESTLAND: 'EE', // German

  // =====================
  // FINLAND (FI)
  // =====================
  FINLAND: 'FI',
  FINLANDE: 'FI', // French
  FINNLAND: 'FI', // German
  FINLANDIA: 'FI', // Spanish

  // =====================
  // FRANCE (FR)
  // =====================
  FRANCE: 'FR',
  FRANKREICH: 'FR', // German
  FRANCIA: 'FR', // Spanish

  // =====================
  // GERMANY (DE)
  // =====================
  GERMANY: 'DE',
  ALLEMAGNE: 'DE', // French
  DEUTSCHLAND: 'DE', // German
  ALEMANIA: 'DE', // Spanish

  // =====================
  // GREECE (GR)
  // =====================
  GREECE: 'GR',
  GRÈCE: 'GR', // French
  GRECE: 'GR', // French (no accent)
  GRIECHENLAND: 'GR', // German
  GRECIA: 'GR', // Spanish

  // =====================
  // HUNGARY (HU)
  // =====================
  HUNGARY: 'HU',
  HONGRIE: 'HU', // French
  UNGARN: 'HU', // German
  HUNGRÍA: 'HU', // Spanish
  HUNGRIA: 'HU', // Spanish (no accent)

  // =====================
  // ICELAND (IS)
  // =====================
  ICELAND: 'IS',
  ISLANDE: 'IS', // French
  ISLAND: 'IS', // German
  ISLANDIA: 'IS', // Spanish

  // =====================
  // ITALY (IT)
  // =====================
  ITALY: 'IT',
  ITALIE: 'IT', // French
  ITALIEN: 'IT', // German
  ITALIA: 'IT', // Spanish

  // =====================
  // LATVIA (LV)
  // =====================
  LATVIA: 'LV',
  LETTONIE: 'LV', // French
  LETTLAND: 'LV', // German
  LETONIA: 'LV', // Spanish

  // =====================
  // LIECHTENSTEIN (LI)
  // =====================
  LIECHTENSTEIN: 'LI', // Same in all languages

  // =====================
  // LITHUANIA (LT)
  // =====================
  LITHUANIA: 'LT',
  LITUANIE: 'LT', // French
  LITAUEN: 'LT', // German
  LITUANIA: 'LT', // Spanish

  // =====================
  // LUXEMBOURG (LU)
  // =====================
  LUXEMBOURG: 'LU', // English & French
  LUXEMBURG: 'LU', // German
  LUXEMBURGO: 'LU', // Spanish

  // =====================
  // MALTA (MT)
  // =====================
  MALTA: 'MT',
  MALTE: 'MT', // French

  // =====================
  // NETHERLANDS (NL)
  // =====================
  NETHERLANDS: 'NL',
  'THE NETHERLANDS': 'NL',
  'PAYS-BAS': 'NL', // French
  'PAYS BAS': 'NL', // French (no hyphen)
  NIEDERLANDE: 'NL', // German
  'PAÍSES BAJOS': 'NL', // Spanish
  'PAISES BAJOS': 'NL', // Spanish (no accent)
  HOLLAND: 'NL', // Common alias

  // =====================
  // NORWAY (NO)
  // =====================
  NORWAY: 'NO',
  NORVÈGE: 'NO', // French
  NORVEGE: 'NO', // French (no accent)
  NORWEGEN: 'NO', // German
  NORUEGA: 'NO', // Spanish

  // =====================
  // POLAND (PL)
  // =====================
  POLAND: 'PL',
  POLOGNE: 'PL', // French
  POLEN: 'PL', // German
  POLONIA: 'PL', // Spanish

  // =====================
  // PORTUGAL (PT)
  // =====================
  PORTUGAL: 'PT', // Same in all languages

  // =====================
  // SLOVAKIA (SK)
  // =====================
  SLOVAKIA: 'SK',
  SLOVAQUIE: 'SK', // French
  SLOWAKEI: 'SK', // German
  ESLOVAQUIA: 'SK', // Spanish

  // =====================
  // SLOVENIA (SI)
  // =====================
  SLOVENIA: 'SI',
  SLOVÉNIE: 'SI', // French
  SLOVENIE: 'SI', // French (no accent)
  SLOWENIEN: 'SI', // German
  ESLOVENIA: 'SI', // Spanish

  // =====================
  // SPAIN (ES)
  // =====================
  SPAIN: 'ES',
  ESPAGNE: 'ES', // French
  SPANIEN: 'ES', // German
  ESPAÑA: 'ES', // Spanish
  ESPANA: 'ES', // Spanish (no tilde)

  // =====================
  // SWEDEN (SE)
  // =====================
  SWEDEN: 'SE',
  SUÈDE: 'SE', // French
  SUEDE: 'SE', // French (no accent)
  SCHWEDEN: 'SE', // German
  SUECIA: 'SE', // Spanish

  // =====================
  // SWITZERLAND (CH)
  // =====================
  SWITZERLAND: 'CH',
  SUISSE: 'CH', // French
  SCHWEIZ: 'CH', // German
  SUIZA: 'CH', // Spanish

  // =====================
  // NON-SCHENGEN EU
  // =====================

  // IRELAND (IE)
  IRELAND: 'IE',
  IRLANDE: 'IE', // French
  IRLAND: 'IE', // German
  IRLANDA: 'IE', // Spanish

  // CYPRUS (CY)
  CYPRUS: 'CY',
  CHYPRE: 'CY', // French
  ZYPERN: 'CY', // German
  CHIPRE: 'CY', // Spanish

  // UNITED KINGDOM (GB)
  'UNITED KINGDOM': 'GB',
  'ROYAUME-UNI': 'GB', // French
  'ROYAUME UNI': 'GB', // French (no hyphen)
  'VEREINIGTES KÖNIGREICH': 'GB', // German
  'VEREINIGTES KONIGREICH': 'GB', // German (no umlaut)
  GROSSBRITANNIEN: 'GB', // German (common)
  'REINO UNIDO': 'GB', // Spanish

  // BULGARIA (BG)
  BULGARIA: 'BG',
  BULGARIE: 'BG', // French
  BULGARIEN: 'BG', // German

  // ROMANIA (RO)
  ROMANIA: 'RO',
  ROUMANIE: 'RO', // French
  RUMÄNIEN: 'RO', // German
  RUMANIEN: 'RO', // German (no umlaut)
  RUMANIA: 'RO', // Spanish
  RUMANÍA: 'RO', // Spanish (with accent)
};

/**
 * Converts a country name or code to its 2-letter ISO code.
 *
 * Accepts any ISO 3166-1 alpha-2 code (2 uppercase letters) as a valid
 * pass-through, enabling worldwide coverage for tax and audit use cases.
 * Full country names are resolved via COUNTRY_NAME_TO_CODE.
 *
 * @param country - Country name ("Germany") or code ("DE", "US", "JP", ...)
 * @returns 2-letter ISO code or null if not recognized
 *
 * @example
 * toCountryCode("Germany")  // "DE"
 * toCountryCode("DE")       // "DE"
 * toCountryCode("US")       // "US"
 * toCountryCode("de")       // "DE"
 * toCountryCode("Unknown")  // null
 */
export function toCountryCode(country: string): string | null {
  if (!country) return null;

  const normalized = country.trim().toUpperCase();

  // Handle "UK" alias for "GB"
  if (normalized === 'UK') {
    return 'GB';
  }

  // Accept any ISO 3166-1 alpha-2 format: exactly 2 uppercase letters
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Look up by full country name (English, French, German, Spanish)
  const code = COUNTRY_NAME_TO_CODE[normalized];
  return code ?? null;
}

/**
 * Checks if a value is a valid country (either name or code).
 * Does NOT convert - just validates.
 */
export function isValidCountry(country: string): boolean {
  return toCountryCode(country) !== null;
}
