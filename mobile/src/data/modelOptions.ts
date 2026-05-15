export const BUILD_OPTIONS = [
  { id: 'slim', label: 'Slim' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'average', label: 'Average' },
  { id: 'curvy', label: 'Curvy' },
  { id: 'plus_size', label: 'Plus Size' },
];

export const ETHNICITY_OPTIONS = [
  { id: 'arab', label: 'Arab' },
  { id: 'asian', label: 'Asian' },
  { id: 'black', label: 'Black / African' },
  { id: 'caucasian', label: 'Caucasian / White' },
  { id: 'hispanic', label: 'Hispanic / Latino' },
  { id: 'middle_eastern', label: 'Middle Eastern' },
  { id: 'mixed', label: 'Mixed / Multiracial' },
  { id: 'south_asian', label: 'South Asian' },
  { id: 'other', label: 'Other' },
];

export const SHOE_SIZES_EU = Array.from({ length: 14 }, (_, i) =>
  (35 + i).toString()
).map((size) => ({ id: size, label: `EU ${size}` }));

export const HEIGHT_RANGE = {
  min: 140,
  max: 210,
  defaultMin: 155,
  defaultMax: 195,
};

export const WEIGHT_RANGE = { min: 40, max: 150 };

export const getEthnicityLabel = (id: string | null): string => {
  if (!id) return '';
  const option = ETHNICITY_OPTIONS.find((o) => o.id === id);
  return option?.label || id.replace(/_/g, ' ');
};
