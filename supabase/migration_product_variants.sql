-- Migration: Add product variants support
-- This allows products to have multiple price/quantity options (e.g., 1g: $200, Media oz: $600, Una oz: $800)

-- Add variants field to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN products.variants IS 'Array of product variants with format: [{"name": "1g", "price": 200, "mrp": 250}, ...]';

-- Update existing products to have empty variants array if null
UPDATE products
SET variants = '[]'::jsonb
WHERE variants IS NULL;

