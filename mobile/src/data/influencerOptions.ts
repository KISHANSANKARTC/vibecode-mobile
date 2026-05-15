export const INFLUENCER_NICHES = [
  { value: 'fashion_style', label: 'Fashion & Style' },
  { value: 'beauty_skincare', label: 'Beauty & Skincare' },
  { value: 'fitness_health', label: 'Fitness & Health' },
  { value: 'food_lifestyle', label: 'Food & Lifestyle' },
  { value: 'travel_adventure', label: 'Travel & Adventure' },
  { value: 'tech_gaming', label: 'Tech & Gaming' },
  { value: 'parenting_family', label: 'Parenting & Family' },
  { value: 'luxury_highend', label: 'Luxury & High-End' },
  { value: 'comedy_entertainment', label: 'Comedy & Entertainment' },
  { value: 'business_finance', label: 'Business & Finance' },
  { value: 'art_design', label: 'Art & Design' },
  { value: 'music', label: 'Music' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'sustainability', label: 'Sustainability & Eco' },
] as const;

export const AUDIENCE_TYPES = [
  { value: 'female_majority', label: 'Female Majority' },
  { value: 'male_majority', label: 'Male Majority' },
  { value: 'gen_z', label: 'Gen Z (18-24)' },
  { value: 'millennials', label: 'Millennials (25-40)' },
  { value: 'gen_x', label: 'Gen X (41-56)' },
  { value: 'parents', label: 'Parents' },
  { value: 'professionals', label: 'Professionals' },
  { value: 'students', label: 'Students' },
  { value: 'luxury_consumers', label: 'Luxury Consumers' },
  { value: 'health_conscious', label: 'Health Conscious' },
  { value: 'local_uae', label: 'Local UAE' },
  { value: 'global_audience', label: 'Global Audience' },
  { value: 'mena_region', label: 'MENA Region' },
] as const;

export const getNicheLabel = (value: string): string =>
  INFLUENCER_NICHES.find((n) => n.value === value)?.label || value;

export const getAudienceLabel = (value: string): string =>
  AUDIENCE_TYPES.find((a) => a.value === value)?.label || value;
