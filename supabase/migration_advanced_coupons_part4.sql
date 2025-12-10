-- Migration Part 4: Triggers and Comments

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;

-- Create trigger for updated_at
CREATE TRIGGER update_coupons_updated_at 
  BEFORE UPDATE ON coupons
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE coupons IS 'Advanced coupons system supporting multiple discount types: percentage, fixed_amount, free_shipping, free_product, gift';
COMMENT ON COLUMN coupons.type IS 'Coupon type: percentage (discount %), fixed_amount (fixed $ off), free_shipping (remove shipping cost), free_product (specific product free), gift (gift item)';
COMMENT ON COLUMN coupons.applicable_vendor_ids IS 'JSONB array of vendor UUIDs. NULL means applies to all stores. Example: ["uuid1", "uuid2"]';

