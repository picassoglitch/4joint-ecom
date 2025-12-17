-- Migration: Add quantity and unit fields to products table
-- Adds quantity (Float) and unit (String) columns to products table

-- Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS quantity FLOAT,
ADD COLUMN IF NOT EXISTS unit TEXT;

-- Add comment for documentation
COMMENT ON COLUMN products.quantity IS 'Quantity of the product (e.g., 1, 3.5, 10)';
COMMENT ON COLUMN products.unit IS 'Unit of measurement: "g" (gramos) or "ml" (mililitros)';

