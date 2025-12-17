-- Migration: Add colonias selector and courier integration fields
-- Adds service_colonias and show_store_location to vendors table

-- Add new columns to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS service_colonias JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS show_store_location BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_whatsapp_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN vendors.service_colonias IS 'Array of colonias where store delivers (e.g., ["Roma Norte, Cuauhtémoc", "Condesa, Cuauhtémoc"])';
COMMENT ON COLUMN vendors.show_store_location IS 'Whether to show store location on map or only pickup point';
COMMENT ON COLUMN vendors.show_whatsapp_contact IS 'Whether to show WhatsApp contact button in checkout for delivery orders';
COMMENT ON COLUMN vendors.whatsapp_number IS 'WhatsApp number to display in checkout (can be different from contact number)';

