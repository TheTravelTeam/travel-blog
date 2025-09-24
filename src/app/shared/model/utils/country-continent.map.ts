const AFRICA_CODES = [
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ',
  'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA',
  'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM',
  'ZW'
] as const;

const ASIA_CODES = [
  'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'CX', 'CC', 'CY', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL',
  'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP', 'OM', 'PK', 'PS', 'PH', 'QA',
  'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'
] as const;

const EUROPE_CODES = [
  'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'HU',
  'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MT', 'MC', 'MD', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO',
  'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'VA'
] as const;

const NORTH_AMERICA_CODES = [
  'AI', 'AG', 'AW', 'BS', 'BB', 'BZ', 'BM', 'VG', 'CA', 'KY', 'CR', 'CU', 'CW', 'DM', 'DO', 'SV', 'GL', 'GD', 'GP',
  'GT', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'NI', 'PA', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SX', 'TT', 'TC',
  'US', 'VI', 'BQ'
] as const;

const SOUTH_AMERICA_CODES = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE'
] as const;

const OCEANIA_CODES = [
  'AS', 'AU', 'CK', 'FJ', 'PF', 'GU', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'WS',
  'SB', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF'
] as const;

const ANTARCTICA_CODES = ['AQ', 'BV', 'TF', 'HM', 'GS'] as const;

const CONTINENT_LABELS: Record<string, string> = {
  Africa: 'Africa',
  Asia: 'Asia',
  Europe: 'Europe',
  'North America': 'North America',
  'South America': 'South America',
  Oceania: 'Oceania',
  Antarctica: 'Antarctica',
};

function assignCodes(codes: readonly string[], continent: keyof typeof CONTINENT_LABELS, target: Record<string, string>) {
  for (const code of codes) {
    target[code] = CONTINENT_LABELS[continent];
  }
}

const mapping: Record<string, string> = {};
assignCodes(AFRICA_CODES, 'Africa', mapping);
assignCodes(ASIA_CODES, 'Asia', mapping);
assignCodes(EUROPE_CODES, 'Europe', mapping);
assignCodes(NORTH_AMERICA_CODES, 'North America', mapping);
assignCodes(SOUTH_AMERICA_CODES, 'South America', mapping);
assignCodes(OCEANIA_CODES, 'Oceania', mapping);
assignCodes(ANTARCTICA_CODES, 'Antarctica', mapping);

export const COUNTRY_CONTINENT_MAP = mapping;
