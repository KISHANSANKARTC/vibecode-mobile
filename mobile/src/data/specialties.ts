export type TalentCategory =
  | 'photographer'
  | 'model'
  | 'influencer'
  | 'makeup_artist'
  | 'hair_stylist'
  | 'stylist'
  | 'editor'
  | 'graphic_designer'
  | 'creative_director'
  | 'drone_operator'
  | 'music_producer'
  | 'marketing_consultant';

export const categoryLabels: Record<TalentCategory, string> = {
  photographer: 'Photo / Video',
  model: 'Models',
  influencer: 'Influencers',
  makeup_artist: 'Makeup',
  hair_stylist: 'Hair',
  stylist: 'Stylists',
  editor: 'Editors',
  graphic_designer: 'Designers',
  creative_director: 'Directors',
  drone_operator: 'Drone',
  music_producer: 'Music',
  marketing_consultant: 'Marketing',
};

export const specialtiesByCategory: Record<
  TalentCategory,
  { id: string; label: string }[]
> = {
  photographer: [
    { id: 'fashion_photography', label: 'Fashion Photography' },
    { id: 'commercial_photography', label: 'Commercial Photography' },
    { id: 'product_photography', label: 'Product Photography' },
    { id: 'portrait_photography', label: 'Portrait Photography' },
    { id: 'event_photography', label: 'Event Photography' },
    { id: 'wedding_photography', label: 'Wedding Photography' },
    { id: 'food_photography', label: 'Food Photography' },
    { id: 'real_estate_photography', label: 'Real Estate Photography' },
    { id: 'fashion_videography', label: 'Fashion Videography' },
    { id: 'commercial_videography', label: 'Commercial Videography' },
    { id: 'event_videography', label: 'Event Videography' },
    { id: 'brand_films', label: 'Brand Films' },
    { id: 'music_videos', label: 'Music Videos' },
    { id: 'documentary', label: 'Documentary' },
    { id: 'drone_aerial', label: 'Drone / Aerial' },
  ],
  model: [
    { id: 'fashion_model', label: 'Fashion Model' },
    { id: 'commercial_model', label: 'Commercial Model' },
    { id: 'fitness_model', label: 'Fitness Model' },
    { id: 'runway_model', label: 'Runway Model' },
    { id: 'parts_model', label: 'Parts Model (Hands/Feet)' },
    { id: 'plus_size_model', label: 'Plus Size Model' },
    { id: 'petite_model', label: 'Petite Model' },
    { id: 'catalog_model', label: 'Catalog Model' },
    { id: 'promotional_model', label: 'Promotional Model' },
    { id: 'influencer_content_creator', label: 'Influencer / Content Creator' },
  ],
  influencer: [
    { id: 'lifestyle_influencer', label: 'Lifestyle Influencer' },
    { id: 'fashion_influencer', label: 'Fashion Influencer' },
    { id: 'beauty_influencer', label: 'Beauty Influencer' },
    { id: 'fitness_influencer', label: 'Fitness Influencer' },
    { id: 'travel_influencer', label: 'Travel Influencer' },
    { id: 'food_influencer', label: 'Food Influencer' },
    { id: 'tech_influencer', label: 'Tech Influencer' },
    { id: 'parenting_influencer', label: 'Parenting Influencer' },
    { id: 'luxury_influencer', label: 'Luxury Influencer' },
  ],
  makeup_artist: [
    { id: 'bridal_makeup', label: 'Bridal Makeup' },
    { id: 'fashion_editorial', label: 'Fashion / Editorial' },
    { id: 'sfx_prosthetics', label: 'SFX / Prosthetics' },
    { id: 'beauty_glam', label: 'Beauty / Glam' },
    { id: 'theatrical_film', label: 'Theatrical / Film' },
    { id: 'airbrush', label: 'Airbrush' },
    { id: 'natural_nomakeup', label: 'Natural / No-Makeup Look' },
  ],
  hair_stylist: [
    { id: 'bridal_hair', label: 'Bridal Hair' },
    { id: 'fashion_editorial_hair', label: 'Fashion / Editorial' },
    { id: 'color_specialist', label: 'Color Specialist' },
    { id: 'extensions_specialist', label: 'Extensions Specialist' },
    { id: 'barbering', label: 'Barbering' },
    { id: 'theatrical_film_hair', label: 'Theatrical / Film' },
  ],
  stylist: [
    { id: 'fashion_stylist', label: 'Fashion Stylist' },
    { id: 'personal_stylist', label: 'Personal Stylist' },
    { id: 'editorial_stylist', label: 'Editorial Stylist' },
    { id: 'commercial_stylist', label: 'Commercial Stylist' },
    { id: 'celebrity_stylist', label: 'Celebrity Stylist' },
    { id: 'wardrobe_consultant', label: 'Wardrobe Consultant' },
  ],
  editor: [
    { id: 'video_editor', label: 'Video Editor' },
    { id: 'photo_retoucher', label: 'Photo Retoucher' },
    { id: 'colorist', label: 'Colorist' },
    { id: 'motion_animation_editor', label: 'Motion / Animation Editor' },
    { id: 'podcast_audio_editor', label: 'Podcast / Audio Editor' },
    { id: 'social_media_editor', label: 'Social Media Editor' },
  ],
  graphic_designer: [
    { id: 'brand_identity', label: 'Brand Identity' },
    { id: 'social_media_graphics', label: 'Social Media Graphics' },
    { id: 'print_design', label: 'Print Design' },
    { id: 'packaging_design', label: 'Packaging Design' },
    { id: 'web_design', label: 'Web Design' },
    { id: 'illustration', label: 'Illustration' },
    { id: 'typography', label: 'Typography' },
    { id: 'presentation_design', label: 'Presentation Design' },
  ],
  creative_director: [
    { id: 'brand_creative_director', label: 'Brand Creative Director' },
    { id: 'art_director', label: 'Art Director' },
    { id: 'film_director', label: 'Film Director' },
    { id: 'commercial_director', label: 'Commercial Director' },
    { id: 'music_video_director', label: 'Music Video Director' },
    { id: 'fashion_director', label: 'Fashion Director' },
  ],
  drone_operator: [
    { id: 'aerial_photography', label: 'Aerial Photography' },
    { id: 'aerial_videography', label: 'Aerial Videography' },
    { id: 'real_estate_aerial', label: 'Real Estate Aerial' },
    { id: 'event_coverage', label: 'Event Coverage' },
    { id: 'commercial_advertising', label: 'Commercial / Advertising' },
    { id: 'inspection_survey', label: 'Inspection & Survey' },
    { id: 'fpv_drone', label: 'FPV Drone' },
    { id: 'mapping_surveying', label: 'Mapping & Surveying' },
  ],
  music_producer: [
    { id: 'commercial_music', label: 'Commercial Music' },
    { id: 'sound_design', label: 'Sound Design' },
    { id: 'jingles_ads', label: 'Jingles & Ads' },
    { id: 'film_scoring', label: 'Film Scoring' },
    { id: 'podcast_audio', label: 'Podcast Audio' },
    { id: 'mixing_mastering', label: 'Mixing & Mastering' },
    { id: 'voice_over_direction', label: 'Voice Over Direction' },
  ],
  marketing_consultant: [
    { id: 'social_media_strategy', label: 'Social Media Strategy' },
    { id: 'brand_strategy', label: 'Brand Strategy' },
    { id: 'content_strategy', label: 'Content Strategy' },
    { id: 'influencer_marketing', label: 'Influencer Marketing' },
    { id: 'performance_marketing', label: 'Performance Marketing' },
    { id: 'pr_communications', label: 'PR & Communications' },
    { id: 'growth_marketing', label: 'Growth Marketing' },
  ],
};
