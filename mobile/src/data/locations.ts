export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  exchangeRateToUSD: number;
}

export interface Country {
  id: string;
  label: string;
  flag: string;
  currency: CurrencyInfo;
}

export interface Nationality {
  id: string;
  label: string;
  flag: string;
}

export const NATIONALITIES: Nationality[] = [
  { id: 'emirati', label: 'Emirati', flag: '🇦🇪' },
  { id: 'saudi', label: 'Saudi Arabian', flag: '🇸🇦' },
  { id: 'egyptian', label: 'Egyptian', flag: '🇪🇬' },
  { id: 'lebanese', label: 'Lebanese', flag: '🇱🇧' },
  { id: 'moroccan', label: 'Moroccan', flag: '🇲🇦' },
  { id: 'jordanian', label: 'Jordanian', flag: '🇯🇴' },
  { id: 'palestinian', label: 'Palestinian', flag: '🇵🇸' },
  { id: 'syrian', label: 'Syrian', flag: '🇸🇾' },
  { id: 'iraqi', label: 'Iraqi', flag: '🇮🇶' },
  { id: 'kuwaiti', label: 'Kuwaiti', flag: '🇰🇼' },
  { id: 'qatari', label: 'Qatari', flag: '🇶🇦' },
  { id: 'bahraini', label: 'Bahraini', flag: '🇧🇭' },
  { id: 'omani', label: 'Omani', flag: '🇴🇲' },
  { id: 'yemeni', label: 'Yemeni', flag: '🇾🇪' },
  { id: 'algerian', label: 'Algerian', flag: '🇩🇿' },
  { id: 'tunisian', label: 'Tunisian', flag: '🇹🇳' },
  { id: 'libyan', label: 'Libyan', flag: '🇱🇾' },
  { id: 'sudanese', label: 'Sudanese', flag: '🇸🇩' },
  { id: 'british', label: 'British', flag: '🇬🇧' },
  { id: 'american', label: 'American', flag: '🇺🇸' },
  { id: 'canadian', label: 'Canadian', flag: '🇨🇦' },
  { id: 'australian', label: 'Australian', flag: '🇦🇺' },
  { id: 'french', label: 'French', flag: '🇫🇷' },
  { id: 'german', label: 'German', flag: '🇩🇪' },
  { id: 'spanish', label: 'Spanish', flag: '🇪🇸' },
  { id: 'italian', label: 'Italian', flag: '🇮🇹' },
  { id: 'portuguese', label: 'Portuguese', flag: '🇵🇹' },
  { id: 'dutch', label: 'Dutch', flag: '🇳🇱' },
  { id: 'belgian', label: 'Belgian', flag: '🇧🇪' },
  { id: 'swiss', label: 'Swiss', flag: '🇨🇭' },
  { id: 'swedish', label: 'Swedish', flag: '🇸🇪' },
  { id: 'norwegian', label: 'Norwegian', flag: '🇳🇴' },
  { id: 'danish', label: 'Danish', flag: '🇩🇰' },
  { id: 'finnish', label: 'Finnish', flag: '🇫🇮' },
  { id: 'polish', label: 'Polish', flag: '🇵🇱' },
  { id: 'czech', label: 'Czech', flag: '🇨🇿' },
  { id: 'hungarian', label: 'Hungarian', flag: '🇭🇺' },
  { id: 'romanian', label: 'Romanian', flag: '🇷🇴' },
  { id: 'greek', label: 'Greek', flag: '🇬🇷' },
  { id: 'turkish', label: 'Turkish', flag: '🇹🇷' },
  { id: 'indian', label: 'Indian', flag: '🇮🇳' },
  { id: 'pakistani', label: 'Pakistani', flag: '🇵🇰' },
  { id: 'bangladeshi', label: 'Bangladeshi', flag: '🇧🇩' },
  { id: 'sri_lankan', label: 'Sri Lankan', flag: '🇱🇰' },
  { id: 'nepali', label: 'Nepali', flag: '🇳🇵' },
  { id: 'afghan', label: 'Afghan', flag: '🇦🇫' },
  { id: 'iranian', label: 'Iranian', flag: '🇮🇷' },
  { id: 'chinese', label: 'Chinese', flag: '🇨🇳' },
  { id: 'japanese', label: 'Japanese', flag: '🇯🇵' },
  { id: 'korean', label: 'Korean', flag: '🇰🇷' },
  { id: 'thai', label: 'Thai', flag: '🇹🇭' },
  { id: 'vietnamese', label: 'Vietnamese', flag: '🇻🇳' },
  { id: 'malaysian', label: 'Malaysian', flag: '🇲🇾' },
  { id: 'indonesian', label: 'Indonesian', flag: '🇮🇩' },
  { id: 'singaporean', label: 'Singaporean', flag: '🇸🇬' },
  { id: 'philippine', label: 'Philippine', flag: '🇵🇭' },
  { id: 'burmese', label: 'Burmese', flag: '🇲🇲' },
  { id: 'laotian', label: 'Laotian', flag: '🇱🇦' },
  { id: 'cambodian', label: 'Cambodian', flag: '🇰🇭' },
  { id: 'brazilian', label: 'Brazilian', flag: '🇧🇷' },
  { id: 'mexican', label: 'Mexican', flag: '🇲🇽' },
  { id: 'colombian', label: 'Colombian', flag: '🇨🇴' },
  { id: 'argentine', label: 'Argentine', flag: '🇦🇷' },
  { id: 'chilean', label: 'Chilean', flag: '🇨🇱' },
  { id: 'peruvian', label: 'Peruvian', flag: '🇵🇪' },
  { id: 'venezuelan', label: 'Venezuelan', flag: '🇻🇪' },
  { id: 'south_african', label: 'South African', flag: '🇿🇦' },
  { id: 'nigerian', label: 'Nigerian', flag: '🇳🇬' },
  { id: 'kenyan', label: 'Kenyan', flag: '🇰🇪' },
  { id: 'ghanaian', label: 'Ghanaian', flag: '🇬🇭' },
  { id: 'russian', label: 'Russian', flag: '🇷🇺' },
  { id: 'ukrainian', label: 'Ukrainian', flag: '🇺🇦' },
  { id: 'israeli', label: 'Israeli', flag: '🇮🇱' },
  { id: 'new_zealander', label: 'New Zealander', flag: '🇳🇿' },
  { id: 'irish', label: 'Irish', flag: '🇮🇪' },
  { id: 'scottish', label: 'Scottish', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { id: 'welsh', label: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { id: 'other', label: 'Other', flag: '🌍' },
];

export const COUNTRIES: Country[] = [
  {
    id: 'uae',
    label: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: { code: 'AED', symbol: 'د.إ', name: 'Dirham', exchangeRateToUSD: 0.27 },
  },
  {
    id: 'saudi',
    label: 'Saudi Arabia',
    flag: '🇸🇦',
    currency: { code: 'SAR', symbol: 'ر.س', name: 'Riyal', exchangeRateToUSD: 0.27 },
  },
  {
    id: 'qatar',
    label: 'Qatar',
    flag: '🇶🇦',
    currency: { code: 'QAR', symbol: 'ر.ق', name: 'Riyal', exchangeRateToUSD: 0.27 },
  },
  {
    id: 'kuwait',
    label: 'Kuwait',
    flag: '🇰🇼',
    currency: { code: 'KWD', symbol: 'د.ك', name: 'Dinar', exchangeRateToUSD: 3.27 },
  },
  {
    id: 'bahrain',
    label: 'Bahrain',
    flag: '🇧🇭',
    currency: { code: 'BHD', symbol: 'د.ب', name: 'Dinar', exchangeRateToUSD: 2.66 },
  },
  {
    id: 'oman',
    label: 'Oman',
    flag: '🇴🇲',
    currency: { code: 'OMR', symbol: 'ر.ع', name: 'Rial', exchangeRateToUSD: 2.6 },
  },
  {
    id: 'egypt',
    label: 'Egypt',
    flag: '🇪🇬',
    currency: { code: 'EGP', symbol: '£', name: 'Pound', exchangeRateToUSD: 0.032 },
  },
  {
    id: 'lebanon',
    label: 'Lebanon',
    flag: '🇱🇧',
    currency: { code: 'LBP', symbol: 'ل.ل', name: 'Pound', exchangeRateToUSD: 0.000013 },
  },
  {
    id: 'jordan',
    label: 'Jordan',
    flag: '🇯🇴',
    currency: { code: 'JOD', symbol: 'د.ا', name: 'Dinar', exchangeRateToUSD: 1.41 },
  },
  {
    id: 'morocco',
    label: 'Morocco',
    flag: '🇲🇦',
    currency: { code: 'MAD', symbol: 'د.م.', name: 'Dirham', exchangeRateToUSD: 0.1 },
  },
  {
    id: 'uk',
    label: 'United Kingdom',
    flag: '🇬🇧',
    currency: { code: 'GBP', symbol: '£', name: 'Pound', exchangeRateToUSD: 1.28 },
  },
  {
    id: 'usa',
    label: 'United States',
    flag: '🇺🇸',
    currency: { code: 'USD', symbol: '$', name: 'Dollar', exchangeRateToUSD: 1 },
  },
  {
    id: 'canada',
    label: 'Canada',
    flag: '🇨🇦',
    currency: { code: 'CAD', symbol: 'C$', name: 'Dollar', exchangeRateToUSD: 0.74 },
  },
  {
    id: 'australia',
    label: 'Australia',
    flag: '🇦🇺',
    currency: { code: 'AUD', symbol: 'A$', name: 'Dollar', exchangeRateToUSD: 0.66 },
  },
  {
    id: 'france',
    label: 'France',
    flag: '🇫🇷',
    currency: { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 1.08 },
  },
  {
    id: 'germany',
    label: 'Germany',
    flag: '🇩🇪',
    currency: { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 1.08 },
  },
  {
    id: 'spain',
    label: 'Spain',
    flag: '🇪🇸',
    currency: { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 1.08 },
  },
  {
    id: 'italy',
    label: 'Italy',
    flag: '🇮🇹',
    currency: { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 1.08 },
  },
  {
    id: 'india',
    label: 'India',
    flag: '🇮🇳',
    currency: { code: 'INR', symbol: '₹', name: 'Rupee', exchangeRateToUSD: 0.012 },
  },
  {
    id: 'pakistan',
    label: 'Pakistan',
    flag: '🇵🇰',
    currency: { code: 'PKR', symbol: '₨', name: 'Rupee', exchangeRateToUSD: 0.0036 },
  },
];

export const citiesByCountry: Record<string, { id: string; label: string }[]> = {
  uae: [
    { id: 'dubai', label: 'Dubai' },
    { id: 'abu_dhabi', label: 'Abu Dhabi' },
    { id: 'sharjah', label: 'Sharjah' },
    { id: 'ajman', label: 'Ajman' },
    { id: 'fujairah', label: 'Fujairah' },
    { id: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
    { id: 'umm_al_quwain', label: 'Umm Al Quwain' },
  ],
  saudi: [
    { id: 'riyadh', label: 'Riyadh' },
    { id: 'jeddah', label: 'Jeddah' },
    { id: 'dammam', label: 'Dammam' },
    { id: 'medina', label: 'Medina' },
    { id: 'mecca', label: 'Mecca' },
  ],
  egypt: [
    { id: 'cairo', label: 'Cairo' },
    { id: 'alexandria', label: 'Alexandria' },
    { id: 'giza', label: 'Giza' },
    { id: 'luxor', label: 'Luxor' },
    { id: 'aswan', label: 'Aswan' },
  ],
  uk: [
    { id: 'london', label: 'London' },
    { id: 'manchester', label: 'Manchester' },
    { id: 'birmingham', label: 'Birmingham' },
    { id: 'leeds', label: 'Leeds' },
    { id: 'glasgow', label: 'Glasgow' },
  ],
  usa: [
    { id: 'new_york', label: 'New York' },
    { id: 'los_angeles', label: 'Los Angeles' },
    { id: 'chicago', label: 'Chicago' },
    { id: 'san_francisco', label: 'San Francisco' },
    { id: 'miami', label: 'Miami' },
  ],
};

export const getCountryLabel = (id: string | null): string => {
  if (!id) return '';
  const country = COUNTRIES.find((c) => c.id === id);
  return country?.label || id.replace(/_/g, ' ');
};

export const getCountryCurrency = (id: string | null): CurrencyInfo | null => {
  if (!id) return null;
  const country = COUNTRIES.find((c) => c.id === id);
  return country?.currency || null;
};

export const getCountryCities = (countryId: string | null): { id: string; label: string }[] => {
  if (!countryId) return [];
  return citiesByCountry[countryId] || [];
};

export const getNationalityLabel = (id: string | null): string => {
  if (!id) return '';
  const nation = NATIONALITIES.find((n) => n.id === id);
  return nation?.label || id.replace(/_/g, ' ');
};
