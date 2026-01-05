-- Migration: Add service_colonias field to vendors table
-- This stores an array of colonia IDs where the store delivers

-- Add service_colonias column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS service_colonias JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_vendors_service_colonias ON vendors USING GIN (service_colonias);

-- Add comment
COMMENT ON COLUMN vendors.service_colonias IS 'Array of colonia IDs where the store delivers. Used to validate if customer zip code is in service area.';

