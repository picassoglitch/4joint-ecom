-- Migration: Advanced Coupons System (Simple Version)
-- Execute this if the full migration has issues

-- Step 1: Create the coupons table
CREATE TABLE IF NOT EXISTS coupons (
  code VARCHAR(50) PRIMARY KEY,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase DECIMAL(10, 2) DEFAULT 0,
  max_discount DECIMAL(10, 2),
  free_product_id UUID,
  for_new_user BOOLEAN DEFAULT false,
  for_member BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  applicable_vendor_ids JSONB DEFAULT NULL,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

