-- Add columns to contractors (providers)
ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS category text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS latitude float8,
ADD COLUMN IF NOT EXISTS longitude float8,
ADD COLUMN IF NOT EXISTS postcodes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS min_price integer DEFAULT 0;

-- Add columns to jobs
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS main_category text,
ADD COLUMN IF NOT EXISTS subcategory text,
ADD COLUMN IF NOT EXISTS estimated_hours float8,
ADD COLUMN IF NOT EXISTS material_needed boolean,
ADD COLUMN IF NOT EXISTS number_of_workers integer,
ADD COLUMN IF NOT EXISTS complexity integer,
ADD COLUMN IF NOT EXISTS price_modifier float8,
ADD COLUMN IF NOT EXISTS price_ai integer,
ADD COLUMN IF NOT EXISTS customer_lat float8,
ADD COLUMN IF NOT EXISTS customer_lng float8;
