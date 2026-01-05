-- Migration: Add postcode field to user_profiles table
-- This allows storing the user's postal code for service area filtering

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS postcode VARCHAR(10);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_postcode ON user_profiles(postcode) WHERE postcode IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_profiles.postcode IS 'User postal code extracted from location. Used for filtering stores by service area.';



