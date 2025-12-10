-- Migration: Advanced Coupons System
-- This migration creates a comprehensive coupons table with support for multiple discount types

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

-- Step 2: Add foreign key constraint if products table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE coupons 
    ADD CONSTRAINT fk_coupons_free_product 
    FOREIGN KEY (free_product_id) 
    REFERENCES products(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_type ON coupons(type);

-- Step 4: Enable Row Level Security
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Public coupons are viewable by everyone" ON coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;

-- Step 6: Create RLS policies
CREATE POLICY "Public coupons are viewable by everyone"
  ON coupons FOR SELECT
  USING (is_public = true OR expires_at > NOW());

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Step 7: Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;

-- Step 9: Create trigger for updated_at
CREATE TRIGGER update_coupons_updated_at 
  BEFORE UPDATE ON coupons
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Add comments
COMMENT ON TABLE coupons IS 'Advanced coupons system supporting multiple discount types: percentage, fixed_amount, free_shipping, free_product, gift';
COMMENT ON COLUMN coupons.type IS 'Coupon type: percentage (discount %), fixed_amount (fixed $ off), free_shipping (remove shipping cost), free_product (specific product free), gift (gift item)';
COMMENT ON COLUMN coupons.applicable_vendor_ids IS 'JSONB array of vendor UUIDs. NULL means applies to all stores. Example: ["uuid1", "uuid2"]';
