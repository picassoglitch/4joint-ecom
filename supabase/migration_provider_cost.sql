-- Migration: Add provider_cost field to products table
-- This field stores the cost paid to the provider for each product
-- Used for special profit calculations (e.g., GreenBoy 50/50 split)

-- Add provider_cost field to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS provider_cost DECIMAL(10, 2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN products.provider_cost IS 'Costo de proveedor pagado por este producto. Usado para cálculos especiales de ganancias (ej: división 50/50)';

-- Update existing products to have 0 provider_cost if null
UPDATE products
SET provider_cost = 0
WHERE provider_cost IS NULL;

