-- Add consumer fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS zip_code text;
