-- Migration Part 2: Add foreign key and indexes

-- Add foreign key constraint if products table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_coupons_free_product'
    ) THEN
      ALTER TABLE coupons 
      ADD CONSTRAINT fk_coupons_free_product 
      FOREIGN KEY (free_product_id) 
      REFERENCES products(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_type ON coupons(type);

