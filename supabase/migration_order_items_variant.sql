-- Migration: Add variant field to order_items table
-- This stores the selected variant information for each order item

-- Add variant field to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant JSONB;

-- Add comment for documentation
COMMENT ON COLUMN order_items.variant IS 'Variant information: {"name": "1g", "price": 200} or null if no variant';

