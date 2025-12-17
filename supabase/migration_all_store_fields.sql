-- Migration: Add all store/vendor fields
-- This migration adds all the new fields for stores including location, fulfillment, and contact settings
-- Run this in Supabase SQL Editor if you get column errors

-- Add location fields (if not already added)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS service_radius_km DOUBLE PRECISION DEFAULT 10.0;

-- Add colonias and store location fields
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS service_colonias JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS show_store_location BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_whatsapp_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add fulfillment modes (if not already added)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS fulfillment_modes JSONB DEFAULT '{"pickup": false, "delivery": false, "meetupPoint": false}'::jsonb,
ADD COLUMN IF NOT EXISTS meetup_points JSONB DEFAULT '[]'::jsonb;

-- Add delivery settings (if not already added)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS min_order DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee_policy TEXT,
ADD COLUMN IF NOT EXISTS delivery_fee_amount DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee_percent DOUBLE PRECISION DEFAULT 0;

-- Add operating hours (if not already added)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}'::jsonb;

-- Add courier settings (if not already added)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS courier_cost DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS courier_cost_included BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN vendors.service_colonias IS 'Array of colonias where store delivers (e.g., ["Roma Norte, Cuauhtémoc", "Condesa, Cuauhtémoc"])';
COMMENT ON COLUMN vendors.show_store_location IS 'Whether to show store location on map or only pickup point';
COMMENT ON COLUMN vendors.show_whatsapp_contact IS 'Whether to show WhatsApp contact button in checkout for delivery orders';
COMMENT ON COLUMN vendors.whatsapp_number IS 'WhatsApp number to display in checkout (can be different from contact number)';
COMMENT ON COLUMN vendors.service_radius_km IS 'Service radius in kilometers';
COMMENT ON COLUMN vendors.fulfillment_modes IS 'JSON object with pickup, delivery, meetupPoint booleans';
COMMENT ON COLUMN vendors.meetup_points IS 'Array of meetup points with name, address, lat, lng, instructions';

