-- Migration: Support for free promotional items (1 gr gratis)
-- Run this in Supabase SQL Editor

-- Option 1: Make product_id nullable (recommended for flexibility)
ALTER TABLE order_items 
  ALTER COLUMN product_id DROP NOT NULL;

-- Option 2: Create a special "Free Gram" product for tracking
-- This is useful if you want to track free items as actual products
-- Uncomment the following if you prefer this approach:

/*
-- Create a special vendor for promotional items (or use an existing vendor)
-- First, get a vendor_id to use (you can use any existing vendor or create one)
-- Then create the product:

INSERT INTO products (
  id,
  name,
  description,
  price,
  mrp,
  category,
  vendor_id,
  in_stock,
  images,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '1 gr Gratis - Primer Pedido',
  'Producto promocional: 1 gramo gratis para usuarios en su primer pedido',
  0,
  0,
  'Promoción',
  (SELECT id FROM vendors LIMIT 1), -- Use first vendor or create a special one
  true,
  '[]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
*/

-- Note: If you use Option 1 (nullable product_id), you can use the placeholder UUID
-- If you use Option 2, update the code to use the actual product ID

